(function () {

  "use strict";

  document.addEventListener("DOMContentLoaded", async function () {

    const applicationsList =
      document.getElementById("applicationsList");

    try {

      const response = await fetch(
        "/my-courses",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        }
      );

      if (response.status === 401) {
        window.location.href = "login.html";
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load courses.");
      }

      const data = await response.json();

      const courses =
        Array.isArray(data.courses)
          ? data.courses
          : [];

      applicationsList.innerHTML = "";

      if (courses.length === 0) {

        applicationsList.innerHTML = `
          <div class="my-progress-card">
            <p>No applied courses yet.</p>
          </div>
        `;

        return;
      }

      courses.forEach(function (course) {

        const card =
          document.createElement("div");

        card.className = "course-card";

        card.innerHTML = `
          <span class="course-tag">
            ${escapeHTML(course.course_type)}
          </span>

          <h4 class="course-title">
            ${escapeHTML(course.course_name)}
          </h4>

          <p class="course-desc">
            Applied course
          </p>
        `;

        applicationsList.appendChild(card);

      });

    } catch (error) {

      applicationsList.innerHTML = `
        <div class="my-progress-card">
          <p>${escapeHTML(
            error.message ||
            "Unable to load courses."
          )}</p>
        </div>
      `;

    }

  });


  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

})();
