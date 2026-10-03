(function () {

  "use strict";


  document.addEventListener(
    "DOMContentLoaded",
    async function () {


      const applicationsList =
        document.getElementById(
          "applicationsList"
        );

      const coursesSection =
        document.getElementById(
          "coursesSection"
        );

      const contactLink =
        document.getElementById(
          "contactLink"
        );

      const contactSection =
        document.getElementById(
          "contactSection"
        );

      const closeContactButton =
        document.getElementById(
          "closeContactButton"
        );


      /* =========================
         SESSION + COURSES
      ========================== */

      try {

        const response =
          await fetch(
            "/my-courses",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store"
            }
          );


        if (
          response.status === 401
        ) {

          window.location.href =
            "login.html";

          return;
        }


        if (!response.ok) {

          throw new Error(
            "Unable to load courses."
          );

        }


        const data =
          await response.json();


        const courses =
          Array.isArray(
            data.courses
          )
            ? data.courses
            : [];


        applicationsList.innerHTML =
          "";


        if (
          courses.length === 0
        ) {

          applicationsList.innerHTML =
            `
              <div class="my-progress-card">
                <p>
                  No applied courses yet.
                </p>
              </div>
            `;

        } else {


          courses.forEach(
            function (course) {


              const card =
                document.createElement(
                  "div"
                );


              card.className =
                "course-card";


              const type =
                escapeHTML(
                  course.course_type ||
                  "Course"
                );


              const name =
                escapeHTML(
                  course.course_name ||
                  "Applied Course"
                );


              card.innerHTML =
                `
                  <span class="course-tag">
                    ${type}
                  </span>

                  <h4 class="course-title">
                    ${name}
                  </h4>

                  <p class="course-desc">
                    Applied course
                  </p>
                `;


              applicationsList.appendChild(
                card
              );

            }
          );

        }


      } catch (error) {


        applicationsList.innerHTML =
          `
            <div class="my-progress-card">
              <p>
                ${escapeHTML(
                  error.message ||
                  "Unable to load courses."
                )}
              </p>
            </div>
          `;

      }


      /* =========================
         CONTACT OPEN
      ========================== */

      if (
        contactLink &&
        contactSection
      ) {

        contactLink.addEventListener(
          "click",
          function () {


            if (coursesSection) {

              coursesSection.classList.add(
                "hidden"
              );

            }


            contactSection.classList.remove(
              "hidden"
            );


            contactSection.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }
        );

      }


      /* =========================
         CONTACT CLOSE
      ========================== */

      if (
        closeContactButton &&
        contactSection
      ) {

        closeContactButton.addEventListener(
          "click",
          function () {


            contactSection.classList.add(
              "hidden"
            );


            if (coursesSection) {

              coursesSection.classList.remove(
                "hidden"
              );

            }


            if (coursesSection) {

              coursesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

            }

          }
        );

      }


    }
  );


  /* =========================
     ESCAPE HTML
  ========================== */

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


})();
