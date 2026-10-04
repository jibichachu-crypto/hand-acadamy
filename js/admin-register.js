"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminRegisterForm");

    const nameInput = document.getElementById("adminName");
    const emailInput = document.getElementById("adminEmail");
    const phoneInput = document.getElementById("adminPhone");
    const passwordInput = document.getElementById("adminPassword");
    const confirmPasswordInput =
        document.getElementById("adminConfirmPassword");

    const messageBox =
        document.getElementById("adminRegisterMessage");

    const submitButton =
        form ? form.querySelector(".auth-submit") : null;

    const ADMIN_LOGIN_PATH = "/hih-control-84k7/";

    if (!form || !nameInput || !emailInput || !phoneInput ||
        !passwordInput || !confirmPasswordInput ||
        !messageBox || !submitButton) {
        console.error("Admin register form elements are missing.");
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

            submitButton.textContent = "Creating Account...";
        } else {
            submitButton.textContent =
                submitButton.dataset.originalText ||
                "Create Admin Account";
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[0-9+\-\s()]{7,20}$/.test(phone);
    }

    function isStrongPassword(password) {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password)
        );
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!name) {
            showMessage("Please enter admin name.");
            nameInput.focus();
            return;
        }

        if (!email) {
            showMessage("Please enter admin email.");
            emailInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showMessage("Please enter a valid email address.");
            emailInput.focus();
            return;
        }

        if (!phone) {
            showMessage("Please enter phone number.");
            phoneInput.focus();
            return;
        }

        if (!isValidPhone(phone)) {
            showMessage("Please enter a valid phone number.");
            phoneInput.focus();
            return;
        }

        if (!password) {
            showMessage("Please enter a password.");
            passwordInput.focus();
            return;
        }

        if (password.length < 8) {
            showMessage("Password must be at least 8 characters.");
            passwordInput.focus();
            return;
        }

        if (!isStrongPassword(password)) {
            showMessage(
                "Password must contain uppercase, lowercase and a number."
            );
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            confirmPasswordInput.focus();
            return;
        }

        const payload = {
            name: name,
            email: email,
            phone: phone,
            password: password
        };

        setLoading(true);

        try {
            const response = await fetch("/admin/register", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }

            if (!response.ok) {
                const errorMessage =
                    data.error ||
                    data.message ||
                    "Admin registration failed.";

                showMessage(errorMessage, "error");
                return;
            }

            showMessage(
                data.message ||
                "Admin account created successfully. Redirecting...",
                "success"
            );

            form.reset();

            setTimeout(() => {
                window.location.replace(ADMIN_LOGIN_PATH);
            }, 1200);

        } catch (error) {
            console.error("Admin registration error:", error);

            showMessage(
                "Unable to connect to server. Please try again.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    });
});