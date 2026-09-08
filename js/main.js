/* ==========================================================================
   Cylinder Testing Services — main.js
   Vanilla JS. No dependencies. No build step.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Config
     Forms are delivered by FormSubmit (https://formsubmit.co). The first
     submission triggers a one-time activation email to the address below;
     nothing is delivered until that link is clicked. After activation,
     FormSubmit offers a random alias string that can replace the address
     here to keep it out of the page source.
     --------------------------------------------------------------------- */
  var CONFIG = {
    GA4_ID: "G-RY5RWEZWBM",
    FORM_RECIPIENT: "info@cylindertestingservices.ie"
  };
  CONFIG.FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONFIG.FORM_RECIPIENT;

  var CONSENT_COOKIE = "cts_consent";

  /* ---------------------------------------------------------------------
     Footer year
     --------------------------------------------------------------------- */
  document.querySelectorAll("#year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    // Close mobile menu after a nav link is followed
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 999px)").matches) {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
        }
      });
    });
  }

  /* Close open <details> dropdowns when clicking outside (desktop) */
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-dropdown[open]").forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute("open");
    });
  });

  /* ---------------------------------------------------------------------
     Cookie helpers
     --------------------------------------------------------------------- */
  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/; SameSite=Lax";
  }
  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
  }

  /* ---------------------------------------------------------------------
     GA4 — loaded only after explicit consent
     --------------------------------------------------------------------- */
  function loadGA4() {
    if (window.__ga4Loaded) return;
    window.__ga4Loaded = true;
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.GA4_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", CONFIG.GA4_ID, { anonymize_ip: true });
  }

  /* ---------------------------------------------------------------------
     Cookie consent banner
     --------------------------------------------------------------------- */
  var banner = document.getElementById("cookie-banner");
  var consent = getCookie(CONSENT_COOKIE);

  if (consent === "accepted") {
    loadGA4();
  } else if (!consent && banner) {
    banner.hidden = false;
  }

  if (banner) {
    var acceptBtn = banner.querySelector('[data-cookie="accept"]');
    var declineBtn = banner.querySelector('[data-cookie="decline"]');
    if (acceptBtn) {
      acceptBtn.addEventListener("click", function () {
        setCookie(CONSENT_COOKIE, "accepted", 365);
        banner.hidden = true;
        loadGA4();
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener("click", function () {
        setCookie(CONSENT_COOKIE, "declined", 365);
        banner.hidden = true;
      });
    }
  }

  /* ---------------------------------------------------------------------
     AJAX forms (quote form, datasheet request): validation + honeypot + submit
     Any <form data-ajax-form> is handled. Optional attributes:
       data-success  — message shown after a successful send
       data-error    — message shown if sending fails
     --------------------------------------------------------------------- */
  function initAjaxForm(form) {
    var msg = form.querySelector(".form-msg");
    var submitBtn = form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.textContent : "Send";
    var successText = form.getAttribute("data-success") ||
      "Thanks \u2014 your request has been sent. We'll be in touch within one working day.";
    var errorText = form.getAttribute("data-error") ||
      "Something went wrong sending your request. Please call us on (063) 69 698 instead.";

    function showMessage(type, text) {
      msg.innerHTML = text;
      msg.className = "form-msg is-visible form-msg--" + type;
      msg.setAttribute("role", "status");
    }

    function setFieldError(field, text) {
      var errorEl = document.getElementById(field.id + "-error");
      if (errorEl) errorEl.textContent = text;
      field.classList.toggle("invalid", !!text);
      if (text) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    }

    function validate() {
      var valid = true;

      form.querySelectorAll("[required]").forEach(function (field) {
        var empty;
        if (field.type === "checkbox") {
          empty = !field.checked;
        } else if (field.type === "radio") {
          empty = !form.querySelector('input[name="' + field.name + '"]:checked');
        } else {
          empty = !field.value.trim();
        }
        if (empty) {
          setFieldError(field, field.type === "checkbox" ? "Please tick this box to continue." : "This field is required.");
          valid = false;
        } else {
          setFieldError(field, "");
        }
      });

      // Checkbox groups: at least one box must be ticked
      form.querySelectorAll("[data-required-group]").forEach(function (group) {
        var any = group.querySelector('input[type="checkbox"]:checked');
        setFieldError(group, any ? "" : "Please select at least one option.");
        if (!any) valid = false;
      });

      form.querySelectorAll('input[type="email"]').forEach(function (email) {
        if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
          setFieldError(email, "Enter a valid email address.");
          valid = false;
        }
      });

      form.querySelectorAll('input[type="tel"]').forEach(function (phone) {
        if (phone.value.trim() && !/^[0-9+()\s-]{7,20}$/.test(phone.value.trim())) {
          setFieldError(phone, "Enter a valid phone number.");
          valid = false;
        }
      });

      return valid;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: if filled, silently pretend success (bot submission)
      var honeypot = form.querySelector('input[name="_honey"]');
      if (honeypot && honeypot.value) {
        form.reset();
        showMessage("success", successText);
        return;
      }

      if (!validate()) {
        showMessage("error", "Please check the highlighted fields and try again.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      var formData = new FormData(form);

      // Collapse checkbox groups (name="foo[]") into one comma-separated field
      // so they read cleanly in the notification email.
      var groups = {};
      form.querySelectorAll('input[type="checkbox"][name$="[]"]').forEach(function (box) {
        var key = box.name.slice(0, -2);
        groups[key] = groups[key] || [];
        if (box.checked) groups[key].push(box.value);
      });
      Object.keys(groups).forEach(function (key) {
        formData.delete(key + "[]");
        formData.append(key, groups[key].join(", "));
      });

      function reset() {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }

      fetch(CONFIG.FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          reset();
          if (data && (data.success === true || data.success === "true")) {
            form.reset();
            form.hidden = true;
            showMessage("success", successText);
          } else {
            showMessage("error", errorText);
          }
        })
        .catch(function () {
          reset();
          showMessage("error", errorText);
        });
    });
  }

  document.querySelectorAll("form[data-ajax-form]").forEach(initAjaxForm);
})();
