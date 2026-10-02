"use strict";

document.addEventListener("DOMContentLoaded", function () {

  const applicationsList =
    document.getElementById("applicationsList");

  const continueLearningButton =
    document.getElementById("continueLearningButton");


  /* ==============================
     LOAD APPLICATIONS
  ============================== */

  function getApplications() {

    try {

      const stored =
        localStorage.getItem("hih_applications");

      if (!stored) {
        return [];
      }

      const parsed =
        JSON.parse(stored);

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (error) {

      return [];
    }
  }


  /* ==============================
     CREATE COURSE CARD
  ============================== */

  function createCourseCard(application) {

    const card =
      document.createElement("div");

    card.className =
      "course-card my-course-card";


    const tag =
      document.createElement("span");

    tag.className =
      "course-tag";

    tag.textContent =
      "Applied Course";


    const title =
      document.createElement("h3");

    title.className =
      "course-title";

    title.textContent =
      application.course ||
      application.class ||
      "Selected Course";


    const description =
      document.createElement("p");

    description.className =
      "course-desc";


    if (application.type === "foundation") {

      description.textContent =
        "Foundations of Learning";

    } else if (application.type === "academic") {

      description.textContent =
        "Academic Learning";

    } else if (application.type === "plus_two") {

      description.textContent =
        "Higher Secondary";

    } else {

      description.textContent =
        "Your selected course";
    }


    const status =
      document.createElement("span");

    status.className =
      "app-status";

    status.textContent =
      "Applied Successfully";


    const progressText =
      document.createElement("p");

    progressText.className =
      "progress-text";

    progressText.textContent =
      "Progress: 0%";


    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "model-submit";

    button.textContent =
      "Continue Learning";


    button.addEventListener(
      "click",
      function () {

        /*
         * Learning module will be connected
         * here later.
         */

        window.location.href =
          "dashboard.html";

      }
    );


    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(status);
    card.appendChild(progressText);
    card.appendChild(button);


    return card;
  }


  /* ==============================
     SHOW APPLICATIONS
  ============================== */

  function loadApplications() {

    if (!applicationsList) {
      return;
    }


    applicationsList.textContent = "";


    const applications =
      getApplications();


    if (applications.length === 0) {

      const emptyMessage =
        document.createElement("p");

      emptyMessage.className =
        "course-empty-message";

      emptyMessage.textContent =
        "No courses yet. Apply for a course from Dashboard.";

      applicationsList.appendChild(
        emptyMessage
      );

      return;
    }


    applications
      .slice()
      .reverse()
      .forEach(function (application) {

        const card =
          createCourseCard(application);

        applicationsList.appendChild(card);

      });
  }


  /* ==============================
     OLD CONTINUE BUTTON SUPPORT
  ============================== */

  if (continueLearningButton) {

    continueLearningButton.addEventListener(
      "click",
      function () {

        window.location.href =
          "dashboard.html";

      }
    );
  }


  /* ==============================
     INITIAL LOAD
  ============================== */

  loadApplications();

});
