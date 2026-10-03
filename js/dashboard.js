"use strict";

document.addEventListener("DOMContentLoaded", function () {

  /*
   * =========================================
   * AUTHENTICATION
   * =========================================
   */

  checkSession();


  async function checkSession() {

    try {

      const response = await fetch("/session", {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        window.location.replace("login.html");
        return;
      }

      const data = await response.json();

      if (!data.authenticated) {
        window.location.replace("login.html");
        return;
      }


      /*
       * Show logged-in user's real name
       */

      if (
        data.user &&
        data.user.name
      ) {

        const welcomeTitle =
          document.getElementById(
            "welcomeTitle"
          );

        if (welcomeTitle) {

          welcomeTitle.textContent =
            "Welcome back, " +
            data.user.name +
            "! 👋";

        }


        /*
         * Keep localStorage updated
         */

        const user = {
          id:
            data.user.id ||
            data.user_id ||
            null,

          name:
            data.user.name ||
            "",

          email:
            data.user.email ||
            "",

          phone:
            data.user.phone ||
            ""
        };

        localStorage.setItem(
          "hih_user",
          JSON.stringify(user)
        );

      }

    } catch (error) {

      console.error(
        "Session check error:",
        error
      );

      window.location.replace(
        "login.html"
      );

    }

  }


  /*
   * =========================================
   * COURSE ELEMENTS
   * =========================================
   */

  const foundationButton =
    document.getElementById(
      "foundationButton"
    );

  const academicButton =
    document.getElementById(
      "academicButton"
    );

  const plusTwoButton =
    document.getElementById(
      "plusTwoButton"
    );


  const foundationList =
    document.getElementById(
      "foundationList"
    );

  const academicSelection =
    document.getElementById(
      "academicSelection"
    );

  const plusTwoList =
    document.getElementById(
      "plusTwoList"
    );


  /*
   * =========================================
   * OPEN COURSE SECTION
   * =========================================
   */

  function hideAllCourseSections() {

    if (foundationList) {
      foundationList.classList.add(
        "hidden"
      );
    }

    if (academicSelection) {
      academicSelection.classList.add(
        "hidden"
      );
    }

    if (plusTwoList) {
      plusTwoList.classList.add(
        "hidden"
      );
    }

  }


  function openCourseSection(section) {

    hideAllCourseSections();

    if (!section) {
      return;
    }

    section.classList.remove(
      "hidden"
    );

    setTimeout(function () {

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }, 50);

  }


  if (foundationButton) {

    foundationButton.addEventListener(
      "click",
      function () {

        openCourseSection(
          foundationList
        );

      }
    );

  }


  if (academicButton) {

    academicButton.addEventListener(
      "click",
      function () {

        openCourseSection(
          academicSelection
        );

      }
    );

  }


  if (plusTwoButton) {

    plusTwoButton.addEventListener(
      "click",
      function () {

        openCourseSection(
          plusTwoList
        );

      }
    );

  }


  /*
   * =========================================
   * CLOSE COURSE SECTIONS
   * =========================================
   */

  document
    .querySelectorAll(
      ".close-section-btn"
    )
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          const sectionId =
            button.getAttribute(
              "data-close"
            );

          if (!sectionId) {
            return;
          }

          const section =
            document.getElementById(
              sectionId
            );

          if (section) {

            section.classList.add(
              "hidden"
            );

          }

        }
      );

    });


  /*
   * =========================================
   * FOUNDATION COURSE SELECTION
   * =========================================
   */

  const foundationButtons =
    document.querySelectorAll(
      ".foundation-course-button"
    );

  const selectedFoundationArea =
    document.getElementById(
      "selectedFoundationArea"
    );

  const selectedFoundationName =
    document.getElementById(
      "selectedFoundationName"
    );

  const applyFoundationButton =
    document.getElementById(
      "applyFoundationButton"
    );

  const successFoundationMessage =
    document.getElementById(
      "successFoundationMessage"
    );


  let selectedFoundation = "";


  foundationButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          selectedFoundation =
            button.textContent.trim();

          if (selectedFoundationName) {

            selectedFoundationName.textContent =
              selectedFoundation;

          }

          if (selectedFoundationArea) {

            selectedFoundationArea.classList.remove(
              "hidden"
            );

          }

          if (successFoundationMessage) {

            successFoundationMessage.classList.add(
              "hidden"
            );

          }

        }
      );

    }
  );


  if (applyFoundationButton) {

    applyFoundationButton.addEventListener(
      "click",
      function () {

        if (!selectedFoundation) {
          return;
        }

        applyCourse(
          selectedFoundation
        );

      }
    );

  }


  /*
   * =========================================
   * ACADEMIC CLASS SELECTION
   * =========================================
   */

  const classButtons =
    document.querySelectorAll(
      ".class-button"
    );

  const selectedClassArea =
    document.getElementById(
      "selectedClassArea"
    );

  const selectedClassName =
    document.getElementById(
      "selectedClassName"
    );

  const applyButton =
    document.getElementById(
      "applyButton"
    );

  const successMessage =
    document.getElementById(
      "successMessage"
    );


  let selectedClass = "";


  classButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          selectedClass =
            button.textContent.trim();

          if (selectedClassName) {

            selectedClassName.textContent =
              selectedClass;

          }

          if (selectedClassArea) {

            selectedClassArea.classList.remove(
              "hidden"
            );

          }

          if (successMessage) {

            successMessage.classList.add(
              "hidden"
            );

          }

        }
      );

    }
  );


  if (applyButton) {

    applyButton.addEventListener(
      "click",
      function () {

        if (!selectedClass) {
          return;
        }

        applyCourse(
          selectedClass
        );

      }
    );

  }


  /*
   * =========================================
   * PLUS TWO SELECTION
   * =========================================
   */

  const plusTwoButtons =
    document.querySelectorAll(
      ".plus-two-course-button"
    );

  const selectedPlusTwoArea =
    document.getElementById(
      "selectedPlusTwoArea"
    );

  const selectedPlusTwoName =
    document.getElementById(
      "selectedPlusTwoName"
    );

  const applyPlusTwoButton =
    document.getElementById(
      "applyPlusTwoButton"
    );

  const successPlusTwoMessage =
    document.getElementById(
      "successPlusTwoMessage"
    );


  let selectedPlusTwo = "";


  plusTwoButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          selectedPlusTwo =
            button.textContent.trim();

          if (selectedPlusTwoName) {

            selectedPlusTwoName.textContent =
              selectedPlusTwo;

          }

          if (selectedPlusTwoArea) {

            selectedPlusTwoArea.classList.remove(
              "hidden"
            );

          }

          if (successPlusTwoMessage) {

            successPlusTwoMessage.classList.add(
              "hidden"
            );

          }

        }
      );

    }
  );


  if (applyPlusTwoButton) {

    applyPlusTwoButton.addEventListener(
      "click",
      function () {

        if (!selectedPlusTwo) {
          return;
        }

        applyCourse(
          selectedPlusTwo
        );

      }
    );

  }


  /*
   * =========================================
   * APPLY COURSE
   * =========================================
   */

  async function applyCourse(
    courseName
  ) {

    try {

      const response = await fetch(
        "/apply-course",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            course: courseName
          })
        }
      );


      const data =
        await response
          .json()
          .catch(function () {
            return {};
          });


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        window.location.replace(
          "login.html"
        );

        return;

      }


      if (!response.ok) {

        alert(
          data.message ||
          "Unable to apply for course."
        );

        return;

      }


      /*
       * Show correct success message
       */

      if (
        selectedFoundation === courseName &&
        successFoundationMessage
      ) {

        successFoundationMessage.classList.remove(
          "hidden"
        );

      }


      if (
        selectedClass === courseName &&
        successMessage
      ) {

        successMessage.classList.remove(
          "hidden"
        );

      }


      if (
        selectedPlusTwo === courseName &&
        successPlusTwoMessage
      ) {

        successPlusTwoMessage.classList.remove(
          "hidden"
        );

      }


      alert(
        data.message ||
        "Applied Successfully"
      );


    } catch (error) {

      console.error(
        "Apply course error:",
        error
      );

      alert(
        "Cannot connect to server. Please try again."
      );

    }

  }


  /*
   * =========================================
   * CONTACT
   * =========================================
   */

  const contactLink =
    document.getElementById(
      "contactLink"
    );

  const contactSection =
    document.getElementById(
      "contact"
    );

  const closeContactButton =
    document.getElementById(
      "closeContactButton"
    );


  function openContact() {

    /*
     * Hide course selection sections
     */

    hideAllCourseSections();


    if (!contactSection) {
      return;
    }


    contactSection.classList.remove(
      "hidden"
    );


    history.replaceState(
      null,
      "",
      "#contact"
    );


    setTimeout(function () {

      contactSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }, 50);

  }


  function closeContact() {

    if (!contactSection) {
      return;
    }


    contactSection.classList.add(
      "hidden"
    );


    history.replaceState(
      null,
      "",
      window.location.pathname
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  if (contactLink) {

    contactLink.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        openContact();

      }
    );

  }


  if (closeContactButton) {

    closeContactButton.addEventListener(
      "click",
      function () {

        closeContact();

      }
    );

  }


  /*
   * Open Contact automatically
   * when URL contains #contact
   */

  if (
    window.location.hash ===
    "#contact"
  ) {

    openContact();

  }

});
