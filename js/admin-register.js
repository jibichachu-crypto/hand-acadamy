"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const form =
        document.getElementById("adminRegisterForm");

    const message =
        document.getElementById("adminRegisterMessage");


    function showMessage(text, isError) {
        if (!message) {
            return;
        }

        message.hidden = false;
        message.textContent = text;

        message.className =
            "auth-message " +
            (isError ? "error" : "success");
    }


    function clearMessage() {
        if (!message) {
            return;
        }

        message.hidden = true;
        message.textContent = "";
        message.className = "auth-message";
    }


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearMessage();


            const nameInput =
                document.getElementById("adminName");

            const emailInput =
                document.getElementById("adminEmail");

            const phoneInput =
                document.getElementById("adminPhone");

            const passwordInput =
                document.getElementById("adminPassword");

            const confirmPasswordInput =
                document.getElementById(
                    "adminConfirmPassword"
                );


            const name =
                nameInput
                    ? nameInput.value.trim()
                    : "";

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const phone =
                phoneInput
                    ? phoneInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";

            const confirmPassword =
                confirmPasswordInput
                    ? confirmPasswordInput.value
                    : "";


            if (
                !name ||
                !email ||
                !phone ||
                !password ||
                !confirmPassword
            ) {

                showMessage(
                    "All fields are required.",
                    true
                );

                return;
            }


            if (password.length < 8) {

                showMessage(
                    "Password must be at least 8 characters.",
                    true
                );

                return;
            }


            if (password !== confirmPassword) {

                showMessage(
                    "Passwords do not match.",
                    true
                );

                return;
            }


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    "Creating...";
            }


            try {

                const response =
                    await fetch(
                        "/admin/register",
                        {
                            method: "POST",
                            credentials: "include",
                            cache: "no-store",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name: name,
                                email: email,
                                phone: phone,
                                password: password
                            })
                        }
                    );


                const responseText =
                    await response.text();


                let data = {};

                try {
                    data = responseText
                        ? JSON.parse(responseText)
                        : {};
                } catch (error) {
                    data = {};
                }


                if (!response.ok) {

                    showMessage(
                        data.error ||
                        data.message ||
                        responseText.trim() ||
                        "Admin registration failed.",
                        true
                    );

                    return;
                }


                showMessage(
                    data.message ||
                    "Admin account created successfully. Redirecting...",
                    false
                );


                window.setTimeout(
                    function () {

                        window.location.replace(
                            "/admin-login.html"
                        );

                    },
                    800
                );


            } catch (error) {

                showMessage(
                    "Unable to connect to the server.",
                    true
                );

            } finally {

                if (submitButton) {
                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Create Admin Account";
                }
            }
        }
    );

});
