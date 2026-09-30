"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const navItems =
        document.querySelectorAll(".nav-item");

    const sections =
        document.querySelectorAll(".admin-section");

    const adminLogoutButton =
        document.getElementById("adminLogoutButton");


    /* =========================
       SECTION NAVIGATION
    ========================== */

    navItems.forEach(function (button) {

        button.addEventListener("click", function () {

            const targetId =
                this.getAttribute("data-section");

            navItems.forEach(function (item) {
                item.classList.remove("active");
            });

            sections.forEach(function (section) {
                section.classList.remove("active-section");
            });

            this.classList.add("active");

            const target =
                document.getElementById(targetId);

            if (target) {
                target.classList.add("active-section");
            }
        });

    });


    /* =========================
       ADMIN LOGOUT
    ========================== */

    if (adminLogoutButton) {

        adminLogoutButton.addEventListener(
            "click",
            async function () {

                try {
                    await fetch("/logout", {
                        method: "POST",
                        credentials: "include"
                    });
                } catch (error) {
                    /* Redirect even if request fails */
                }

                window.location.replace("login.html");
            }
        );
    }

});