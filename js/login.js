"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginModelForm");
  const loginInput = document.getElementById("login");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("remember");
  const message = document.getElementById("form-message");

  if (
    !form ||
    !loginInput ||
    !passwordInput ||
    !rememberInput
  ) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearErrors();

    const login = loginInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberInput.checked;

    let valid = true;

    /* -----------------------------
       LOGIN VALIDATION
    ----------------------------- */

    if (!login) {
      showError(
        "login-error",
        "Email or phone is required."
      );

      valid = false;
    }

    if (!password) {
      showError(
        "password-error",
        "Password is required."
      );

      valid = false;
    } else if (password.length < 8) {
      showError(
        "password-error",
        "Minimum 8 characters required."
      );

      valid = false;
    }

    /* -----------------------------
       REMEMBER ME REQUIRED
    ----------------------------- */

    if (!rememberMe) {
      showMessage(
        "Please tick Remember me before logging in.",
        "error"
      );

      valid = false;
    }

    if (!valid) {
      if (!rememberMe) {
        rememberInput.focus();
      }

      return;
    }

    showMessage(
      "Checking your login...",
      "normal"
    );

    /* Disable button during login */
    const submitButton =
      form.querySelector(".model-submit");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Logging in...";
    }

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
          data.message ||
            "Invalid login credentials.",
          "error"
        );

        resetButton();
        return;
      }

      /* -----------------------------
         SAVE USER DETAILS
      ----------------------------- */

      if (
        data.user &&
        typeof data.user === "object"
      ) {
        const user = {
          id:
            data.user.id ||
            data.user_id ||
            null,

          name:
            data.user.name ||
            "",

          email:
            data.user.email ||
            "",

          phone:
            data.user.phone ||
            ""
        };

        localStorage.setItem(
          "hih_user",
          JSON.stringify(user)
        );
      } else {
        /* -----------------------------
           FALLBACK /SESSION
        ----------------------------- */

        try {
          const sessionResponse = await fetch(
            "/session",
            {
              method: "GET",
              credentials: "include"
            }
          );

          if (sessionResponse.ok) {
            const sessionData =
              await sessionResponse.json();

            if (
              sessionData.user &&
              typeof sessionData.user === "object"
            ) {
              const user = {
                id:
                  sessionData.user.id ||
                  sessionData.user_id ||
                  null,

                name:
                  sessionData.user.name ||
                  "",

                email:
                  sessionData.user.email ||
                  "",

                phone:
                  sessionData.user.phone ||
                  ""
              };

              localStorage.setItem(
                "hih_user",
                JSON.stringify(user)
              );
            }
          }
        } catch (sessionError) {
          console.error(
            "Session user data error:",
            sessionError
          );
        }
      }

      /* -----------------------------
         SUCCESS
      ----------------------------- */

      showMessage(
        "Login successful! Redirecting...",
        "success"
      );

      window.setTimeout(function () {
        window.location.replace(
          "dashboard.html"
        );
      }, 400);

    } catch (error) {
      console.error(
        "Login request error:",
        error
      );

      showMessage(
        "Cannot connect to server. Please try again.",
        "error"
      );

      resetButton();
    }
  });

  /* -----------------------------
     ERROR DISPLAY
  ----------------------------- */

  function showError(id, text) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = text;
    element.classList.add("show");
  }

  /* -----------------------------
     CLEAR ERRORS
  ----------------------------- */

  function clearErrors() {
    document
      .querySelectorAll(".model-error")
      .forEach(function (element) {
        element.textContent = "";
        element.classList.remove("show");
      });

    if (message) {
      message.textContent = "";
      message.className = "model-message";
    }
  }

  /* -----------------------------
     MESSAGE
  ----------------------------- */

  function showMessage(text, type) {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.className = "model-message";

    if (type === "success") {
      message.classList.add(
        "success",
        "show"
      );
    } else if (type === "error") {
      message.classList.add(
        "error",
        "show"
      );
    } else {
      message.classList.add("show");
    }
  }

  /* -----------------------------
     RESET LOGIN BUTTON
  ----------------------------- */

  function resetButton() {
    const submitButton =
      form.querySelector(".model-submit");

    if (!submitButton) {
      return;
    }

    submitButton.disabled = false;
    submitButton.textContent = "Login";
  }
});