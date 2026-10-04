"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const form =
        document.getElementById("adminLoginForm");

    const message =
        document.getElementById("adminLoginMessage");


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


            const loginInput =
                document.getElementById("adminLogin");

            const passwordInput =
                document.getElementById(
                    "adminLoginPassword"
                );


            const login =
                loginInput
                    ? loginInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (!login || !password) {

                showMessage(
                    "Enter email/phone and password.",
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
                    "Signing in...";
            }


            try {

                const response =
                    await fetch(
                        "/admin/login",
                        {
                            method: "POST",
                            credentials: "include",
                            cache: "no-store",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                login: login,
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
                        "Invalid admin credentials.",
                        true
                    );

                    return;
                }


                showMessage(
                    data.message ||
                    "Admin login successful. Redirecting...",
                    false
                );


                window.location.replace(
                    "/admin.html"
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
                        "Admin Login";
                }
            }
        }
    );

});
