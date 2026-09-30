"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("adminRegisterForm");
    const message = document.getElementById("adminRegisterMessage");

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

        const name =
            document.getElementById("adminName").value.trim();

        const email =
            document.getElementById("adminEmail").value.trim();

        const phone =
            document.getElementById("adminPhone").value.trim();

        const password =
            document.getElementById("adminPassword").value;

        const confirmPassword =
            document.getElementById("adminConfirmPassword").value;

        if (!name || !email || !phone || !password || !confirmPassword) {
            showMessage("All fields are required.", true);
            return;
        }

        if (password.length < 8) {
            showMessage("Password must be at least 8 characters.", true);
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", true);
            return;
        }

        const submitButton =
            form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Creating...";
        }

        try {
            const response = await fetch("/admin/register", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    password: password
                })
            });

            if (!response.ok) {
                const errorText = await response.text();

                showMessage(
                    errorText.trim() || "Admin registration failed.",
                    true
                );

                return;
            }

            showMessage(
                "Admin account created successfully. Redirecting...",
                false
            );

            window.setTimeout(function () {
                window.location.replace("admin-login.html");
            }, 800);

        } catch (error) {
            showMessage(
                "Unable to connect to the server.",
                true
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Create Admin Account";
            }
        }
    });
});