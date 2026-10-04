"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");

    const loginInput = document.getElementById("adminLogin");
    const passwordInput = document.getElementById("adminLoginPassword");

    const messageBox =
        document.getElementById("adminLoginMessage");

    const submitButton =
        form ? form.querySelector(".auth-submit") : null;

    const ADMIN_DASHBOARD_PATH =
        "/hih-control-84k7/dashboard";

    if (
        !form ||
        !loginInput ||
        !passwordInput ||
        !messageBox ||
        !submitButton
    ) {
        console.error("Admin login form elements are missing.");
        return;
    }

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.hidden = false;

        messageBox.classList.remove("success", "error");
        messageBox.classList.add(type);
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.hidden = true;

        messageBox.classList.remove("success", "error");
    }

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;

        if (isLoading) {
            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.textContent = "Signing In...";
        } else {
            submitButton.textContent =
                submitButton.dataset.originalText ||
                "Admin Login";
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const login = loginInput.value.trim();
        const password = passwordInput.value;

        if (!login) {
            showMessage("Please enter your email or phone number.");
            loginInput.focus();
            return;
        }

        if (!password) {
            showMessage("Please enter your password.");
            passwordInput.focus();
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/admin/login", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    login: login,
                    password: password
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }

            if (!response.ok) {
                showMessage(
                    data.error ||
                    data.message ||
                    "Invalid admin login details.",
                    "error"
                );
                return;
            }

            showMessage(
                data.message ||
                "Login successful. Redirecting...",
                "success"
            );

            setTimeout(() => {
                window.location.replace(
                    ADMIN_DASHBOARD_PATH
                );
            }, 500);

        } catch (error) {
            console.error("Admin login error:", error);

            showMessage(
                "Unable to connect to server. Please try again.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    });
});