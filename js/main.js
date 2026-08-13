/* ==========================================================================
   Cylinder Testing Services — main.js
   Vanilla JS. No dependencies. No build step.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Config placeholders — replace before launch
     --------------------------------------------------------------------- */
  var CONFIG = {
    GA4_ID: "G-XXXXXXXXXX", // TODO: replace with live GA4 measurement ID
    FORM_ENDPOINT: "https://api.web3forms.com/submit", // Web3Forms endpoint
    FORM_ACCESS_KEY: "YOUR_WEB3FORMS_ACCESS_KEY" // TODO: replace with client's Web3Forms access key
  };

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
     Quote form: client-side validation + honeypot + AJAX submit
     --------------------------------------------------------------------- */
  var form = document.getElementById("quote-form-el");
  if (form) {
    var msg = form.querySelector(".form-msg");
    var submitBtn = form.querySelector('button[type="submit"]');

    function showMessage(type, text) {
      msg.textContent = text;
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
      var required = form.querySelectorAll("[required]");
      required.forEach(function (field) {
        if (!field.value.trim()) {
          setFieldError(field, "This field is required.");
          valid = false;
        } else {
          setFieldError(field, "");
        }
      });

      var email = form.querySelector("#quote-email");
      if (email && email.value.trim()) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.value.trim())) {
          setFieldError(email, "Enter a valid email address.");
          valid = false;
        }
      }

      var phone = form.querySelector("#quote-phone");
      if (phone && phone.value.trim()) {
        var phonePattern = /^[0-9+()\s-]{7,20}$/;
        if (!phonePattern.test(phone.value.trim())) {
          setFieldError(phone, "Enter a valid phone number.");
          valid = false;
        }
      }

      return valid;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: if filled, silently pretend success (bot submission)
      var honeypot = form.querySelector('input[name="botcheck"]');
      if (honeypot && honeypot.value) {
        form.reset();
        showMessage("success", "Thanks — your request has been sent. We'll be in touch shortly.");
        return;
      }

      if (!validate()) {
        showMessage("error", "Please check the highlighted fields and try again.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      var formData = new FormData(form);
      formData.append("access_key", CONFIG.FORM_ACCESS_KEY);

      fetch(CONFIG.FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request a quote";
          if (data.success) {
            form.reset();
            form.hidden = true;
            showMessage("success", "Thanks — your request has been sent. We'll be in touch within one working day.");
          } else {
            showMessage("error", "Something went wrong sending your request. Please call us on (063) 20700 instead.");
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request a quote";
          showMessage("error", "Something went wrong sending your request. Please call us on (063) 20700 instead.");
        });
    });
  }
})();
