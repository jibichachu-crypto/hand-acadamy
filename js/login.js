"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginModelForm");
  const loginInput = document.getElementById("login");
  const passwordInput = document.getElementById("password");
  const message = document.getElementById("form-message");

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearErrors();

    const login = loginInput.value.trim();
    const password = passwordInput.value;

    let valid = true;

    if (!login) {
      showError("login-error", "Email or phone is required.");
      valid = false;
    }

    if (!password) {
      showError("password-error", "Password is required.");
      valid = false;
    } else if (password.length < 8) {
      showError(
        "password-error",
        "Minimum 8 characters required."
      );
      valid = false;
    }

    if (!valid) {
      showMessage(
        "Please correct the errors above.",
        "error"
      );
      return;
    }

    showMessage(
      "Checking your login...",
      "normal"
    );

    try {
      const response = await fetch("/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          login: login,
          password: password
        })
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        showMessage(
          data.message || "Invalid login credentials.",
          "error"
        );
        return;
      }

      showMessage(
        "Login successful! Redirecting...",
        "success"
      );

      window.location.replace("dashboard.html");

    } catch (error) {
      showMessage(
        "Cannot connect to server. Please make sure the backend is running.",
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