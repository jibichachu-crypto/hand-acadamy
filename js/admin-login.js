"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("adminLoginForm");
    const message = document.getElementById("adminLoginMessage");

    function showMessage(text, isError) {
        if (!message) return;

        message.hidden = false;
        message.textContent = text;

        message.style.backgroundColor = isError
            ? "#fff1f1"
            : "#edf7ed";

        message.style.color = isError
            ? "#a61b1b"
            : "#227a22";
    }

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const login =
            document.getElementById("adminLogin").value.trim();

        const password =
            document.getElementById("adminLoginPassword").value;

        if (!login || !password) {
            showMessage(
                "Enter email/phone and password.",
                true
            );
            return;
        }

        const submitButton =
            form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Signing in...";
        }

        try {
            const response = await fetch("/admin/login", {
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

            if (!response.ok) {
                const errorText = await response.text();

                showMessage(
                    errorText.trim() || "Invalid admin credentials.",
                    true
                );

                return;
            }

            showMessage(
                "Admin login successful. Redirecting...",
                false
            );

            window.location.replace("admin.html");

        } catch (error) {
            showMessage(
                "Unable to connect to the server.",
                true
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Admin Login";
            }
        }
    });
});