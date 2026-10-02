/* HAND IN HAND ACADEMY - Profile JS
   Shows and updates user details from login
*/

(function () {
  "use strict";

  const avatarCircle = document.getElementById("avatarCircle");
  const nameDisplay = document.getElementById("profileNameDisplay");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  const statCourses = document.getElementById("statCourses");
  const statApps = document.getElementById("statApps");

  const pName = document.getElementById("pName");
  const pEmail = document.getElementById("pEmail");
  const pPhone = document.getElementById("pPhone");
  const pCountryCode = document.getElementById("pCountryCode");
  const pGrade = document.getElementById("pGrade");
  const pSyllabus = document.getElementById("pSyllabus");
  const pBio = document.getElementById("pBio");

  const pMessage = document.getElementById("pMessage");
  const profileForm = document.getElementById("profileForm");
  const cancelBtn = document.getElementById("cancelBtn");


  /* ==============================
     GET USER DATA
  ============================== */

  function getUserData() {
    try {
      const data = localStorage.getItem("hih_user");

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);

      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return parsed;

    } catch (error) {
      return null;
    }
  }


  let user = getUserData();


  /* ==============================
     LOGIN CHECK
  ============================== */

  if (!user) {

    const welcome = document.querySelector(".welcome");

    if (welcome) {

      const heading = welcome.querySelector("h2");
      const paragraph = welcome.querySelector("p");

      if (heading) {
        heading.textContent = "Please Login First 🔒";
      }

      if (paragraph) {
        paragraph.textContent =
          "No user data found. Redirecting to login page...";
      }
    }

    window.setTimeout(function () {
      window.location.href = "login.html";
    }, 1500);

    return;
  }


  /* ==============================
     APPLICATION / COURSE STATS
  ============================== */

  function updateStats() {

    try {

      const storedApps =
        localStorage.getItem("hih_applications");

      const apps = storedApps
        ? JSON.parse(storedApps)
        : [];

      if (!Array.isArray(apps)) {
        if (statApps) {
          statApps.textContent = "0";
        }

        if (statCourses) {
          statCourses.textContent = "0";
        }

        return;
      }

      if (statApps) {
        statApps.textContent = String(apps.length);
      }

      /*
       * Each successful application is currently
       * treated as one course/application.
       */
      if (statCourses) {
        statCourses.textContent = String(apps.length);
      }

    } catch (error) {

      if (statApps) {
        statApps.textContent = "0";
      }

      if (statCourses) {
        statCourses.textContent = "0";
      }
    }
  }


  /* ==============================
     POPULATE PROFILE HEADER
  ============================== */

  function populateHeader() {

    const name =
      typeof user.name === "string" && user.name.trim()
        ? user.name.trim()
        : "Learner";

    const email =
      typeof user.email === "string" && user.email.trim()
        ? user.email.trim()
        : "learner@example.com";

    const firstLetter =
      name.charAt(0).toUpperCase();


    if (avatarCircle) {
      avatarCircle.textContent = firstLetter;
    }

    if (nameDisplay) {
      nameDisplay.textContent = name;
    }

    if (emailDisplay) {
      emailDisplay.textContent = email;
    }

    updateStats();
  }


  /* ==============================
     POPULATE FORM
  ============================== */

  function populateForm() {

    if (!user) {
      return;
    }

    if (pName) {
      pName.value = user.name || "";
    }

    if (pEmail) {
      pEmail.value = user.email || "";
    }

    if (pPhone) {
      pPhone.value = user.phone || "";
    }

    if (
      pCountryCode &&
      typeof user.countryCode === "string"
    ) {
      pCountryCode.value = user.countryCode;
    }

    if (
      pGrade &&
      typeof user.grade === "string"
    ) {
      pGrade.value = user.grade;
    }

    if (
      pSyllabus &&
      typeof user.syllabus === "string"
    ) {
      pSyllabus.value = user.syllabus;
    }


    if (pBio) {

      try {

        const savedBio =
          localStorage.getItem("hih_bio");

        pBio.value = savedBio || "";

      } catch (error) {

        pBio.value = "";
      }
    }
  }


  /* ==============================
     CLEAR ERRORS
  ============================== */

  function clearErrors() {

    document
      .querySelectorAll(".model-error")
      .forEach(function (element) {

        element.textContent = "";
        element.classList.remove("show");

      });
  }


  /* ==============================
     SHOW ERROR
  ============================== */

  function showError(id, message) {

    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.add("show");
  }


  /* ==============================
     SAVE PROFILE
  ============================== */

  if (profileForm) {

    profileForm.addEventListener(
      "submit",
      function (event) {

        event.preventDefault();

        clearErrors();


        const nameValue =
          pName ? pName.value.trim() : "";

        const emailValue =
          pEmail ? pEmail.value.trim() : "";

        const phoneValue =
          pPhone ? pPhone.value.trim() : "";


        /* Name validation */

        if (
          !nameValue ||
          nameValue.length < 3
        ) {

          showError(
            "pName-error",
            "Name must be at least 3 characters"
          );

          return;
        }


        /* Email validation */

        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !emailValue ||
          !emailPattern.test(emailValue)
        ) {

          showError(
            "pEmail-error",
            "Enter a valid email"
          );

          return;
        }


        /* Update user object */

        user.name = nameValue;
        user.email = emailValue;
        user.phone = phoneValue;


        if (pCountryCode) {
          user.countryCode =
            pCountryCode.value;
        }

        if (pGrade) {
          user.grade =
            pGrade.value;
        }

        if (pSyllabus) {
          user.syllabus =
            pSyllabus.value;
        }


        user.fullPhone =
          (pCountryCode
            ? pCountryCode.value
            : "") +
          " " +
          phoneValue;


        /* Save user data */

        try {

          localStorage.setItem(
            "hih_user",
            JSON.stringify(user)
          );

          if (pBio) {

            localStorage.setItem(
              "hih_bio",
              pBio.value
            );
          }

        } catch (error) {

          if (pMessage) {

            pMessage.textContent =
              "Unable to save profile changes.";

            pMessage.className =
              "model-message error show";
          }

          return;
        }


        /* Update screen */

        populateHeader();


        if (pMessage) {

          pMessage.textContent =
            "✅ Profile updated successfully!";

          pMessage.className =
            "model-message success show";


          window.setTimeout(function () {

            pMessage.classList.remove("show");

          }, 3000);
        }

      }
    );
  }


  /* ==============================
     CANCEL
  ============================== */

  if (cancelBtn) {

    cancelBtn.addEventListener(
      "click",
      function () {

        populateForm();

        clearErrors();

        if (pMessage) {
          pMessage.textContent = "";
          pMessage.classList.remove("show");
        }

      }
    );
  }


  /* ==============================
     INITIAL LOAD
  ============================== */

  populateHeader();
  populateForm();

})();
