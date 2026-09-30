"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerModelForm");
  const message = document.getElementById("form-message");

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const countryCode = document.getElementById("countryCode").value;
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm").value;
    const grade = document.getElementById("grade").value;
    const syllabus = document.getElementById("syllabus").value;
    const terms = document.getElementById("agree").checked;

    clearErrors();

    let valid = true;

    if (!name) {
      showError("name-error", "Name is required.");
      valid = false;
    } else if (name.length < 3) {
      showError("name-error", "Name must be at least 3 characters.");
      valid = false;
    } else if (!/^[A-Za-z ]+$/.test(name)) {
      showError("name-error", "Only letters and spaces are allowed.");
      valid = false;
    }

    if (!email) {
      showError("email-error", "Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("email-error", "Enter a valid email address.");
      valid = false;
    }

    if (!phone) {
      showError("phone-error", "Phone number is required.");
      valid = false;
    } else if (!/^\d{7,15}$/.test(phone)) {
      showError("phone-error", "Enter a valid phone number.");
      valid = false;
    } else if (
      countryCode === "+91" &&
      !/^[6-9]\d{9}$/.test(phone)
    ) {
      showError(
        "phone-error",
        "Enter a valid 10-digit Indian mobile number."
      );
      valid = false;
    }

    if (!grade) {
      showError("grade-error", "Please select a grade.");
      valid = false;
    }

    if (!syllabus) {
      showError("syllabus-error", "Please select a syllabus.");
      valid = false;
    }

    if (!password) {
      showError("password-error", "Password is required.");
      valid = false;
    } else if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      showError(
        "password-error",
        "Min 8 characters + 1 uppercase + 1 number required."
      );
      valid = false;
    }

    if (!confirmPassword) {
      showError("confirm-error", "Please confirm your password.");
      valid = false;
    } else if (password !== confirmPassword) {
      showError("confirm-error", "Passwords do not match.");
      valid = false;
    }

    if (!terms) {
      showError(
        "agree-error",
        "You must agree to Terms & Privacy Policy."
      );
      valid = false;
    }

    if (!valid) {
      showMessage("Please correct the errors above.", "error");
      return;
    }

    showMessage("Creating your account...", "normal");

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: countryCode + phone,
          password: password
        })
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        showMessage(
          data.message || "Registration failed.",
          "error"
        );
        return;
      }

      showMessage(
        "✓ Registration successful! Redirecting to login...",
        "success"
      );

      setTimeout(function () {
        window.location.replace("login.html");
      }, 1000);

    } catch (error) {
      showMessage(
        "Cannot connect to server. Please try again.",
        "error"
      );
    }
  });

  function showError(id, text) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = text;
    element.classList.add("show");
  }

  function clearErrors() {
    document.querySelectorAll(".model-error").forEach(function (element) {
      element.textContent = "";
      element.classList.remove("show");
    });
  }

  function showMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = "model-message";

    if (type === "success") {
      message.classList.add("success", "show");
    } else if (type === "error") {
      message.classList.add("error", "show");
    } else {
      message.classList.add("show");
    }
  }
});
