"use strict";

document.addEventListener("DOMContentLoaded", async function () {

  /* ============================================================
     SESSION CHECK
     ============================================================ */

  try {

    const response = await fetch(
      "/session",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      window.location.href = "login.html";
      return;
    }

    const sessionData = await response.json();

    /* Show actual user name when backend provides it */
    const welcomeTitle =
      document.getElementById("welcomeTitle");

    if (
      welcomeTitle &&
      sessionData.user &&
      sessionData.user.name
    ) {
      welcomeTitle.textContent =
        "Welcome back, " +
        sessionData.user.name +
        "! 👋";
    }

  } catch (error) {

    console.error(
      "Session check failed:",
      error
    );

    window.location.href = "login.html";
    return;
  }


  /* ============================================================
     ELEMENTS
     ============================================================ */

  const coursesSection =
    document.getElementById("courses");

  const foundationButton =
    document.getElementById("foundationButton");

  const academicButton =
    document.getElementById("academicButton");

  const plusTwoButton =
    document.getElementById("plusTwoButton");


  /* ---------- Foundation ---------- */

  const foundationList =
    document.getElementById("foundationList");

  const foundationCourseButtons =
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


  /* ---------- Academic ---------- */

  const academicSelection =
    document.getElementById(
      "academicSelection"
    );

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


  /* ---------- Higher Secondary ---------- */

  const plusTwoList =
    document.getElementById(
      "plusTwoList"
    );

  const plusTwoCourseButtons =
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


  /* ---------- Contact ---------- */

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


  /* ============================================================
     SELECTED VALUES
     ============================================================ */

  let selectedFoundation = "";
  let selectedClass = "";
  let selectedPlusTwo = "";


  /* ============================================================
     HIDE ALL COURSE SECTIONS
     ============================================================ */

  function hideAllSections() {

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

    if (contactSection) {
      contactSection.classList.add(
        "hidden"
      );
    }
  }


  /* ============================================================
     RESET MAIN CARD BUTTONS
     ============================================================ */

  function resetMainButtons() {

    if (foundationButton) {
      foundationButton.textContent =
        "Select Course";
    }

    if (academicButton) {
      academicButton.textContent =
        "Select Class";
    }

    if (plusTwoButton) {
      plusTwoButton.textContent =
        "Select Course";
    }
  }


  /* ============================================================
     RESET COURSE SELECTIONS
     ============================================================ */

  function resetSelections() {

    selectedFoundation = "";
    selectedClass = "";
    selectedPlusTwo = "";


    document
      .querySelectorAll(
        ".foundation-course-button, " +
        ".class-button, " +
        ".plus-two-course-button"
      )
      .forEach(
        function (button) {

          button.classList.remove(
            "active"
          );
        }
      );


    if (selectedFoundationName) {
      selectedFoundationName.textContent =
        "";
    }

    if (selectedClassName) {
      selectedClassName.textContent =
        "";
    }

    if (selectedPlusTwoName) {
      selectedPlusTwoName.textContent =
        "";
    }


    if (selectedFoundationArea) {
      selectedFoundationArea.classList.add(
        "hidden"
      );
    }

    if (selectedClassArea) {
      selectedClassArea.classList.add(
        "hidden"
      );
    }

    if (selectedPlusTwoArea) {
      selectedPlusTwoArea.classList.add(
        "hidden"
      );
    }
  }


  /* ============================================================
     RESET SUCCESS MESSAGES
     ============================================================ */

  function resetSuccessMessages() {

    if (successFoundationMessage) {
      successFoundationMessage.classList.add(
        "hidden"
      );
    }

    if (successMessage) {
      successMessage.classList.add(
        "hidden"
      );
    }

    if (successPlusTwoMessage) {
      successPlusTwoMessage.classList.add(
        "hidden"
      );
    }
  }


  /* ============================================================
     SCROLL TO COURSES
     ============================================================ */

  function goToCourses() {

    if (!coursesSection) {
      return;
    }

    coursesSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }


  /* ============================================================
     APPLY COURSE TO DATABASE
     ============================================================ */

  async function applyCourse(
    courseType,
    courseName,
    successElement,
    applyElement
  ) {

    if (!courseName) {
      alert(
        "Please select a course"
      );
      return;
    }


    if (applyElement) {
      applyElement.disabled = true;
      applyElement.textContent =
        "Applying...";
    }


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
            course_type: courseType,
            course_name: courseName
          })
        }
      );


      if (response.status === 401) {

        window.location.href =
          "login.html";

        return;
      }


      if (response.status === 409) {

        alert(
          "You have already applied for this course."
        );

        if (applyElement) {
          applyElement.disabled = false;
          applyElement.textContent =
            "Apply";
        }

        return;
      }


      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          errorText ||
          "Application failed"
        );
      }


      if (successElement) {

        successElement.textContent =
          "✅ Applied Successfully for " +
          courseName;

        successElement.classList.remove(
          "hidden"
        );
      }


      if (applyElement) {

        applyElement.textContent =
          "Applied ✓";
      }


      /*
       * Return to main dashboard after
       * showing success message.
       */

      setTimeout(
        function () {

          resetSuccessMessages();

          hideAllSections();

          resetSelections();

          resetMainButtons();

          if (applyButton) {
            applyButton.disabled = false;
            applyButton.textContent =
              "Apply";
          }

          if (applyFoundationButton) {
            applyFoundationButton.disabled =
              false;
            applyFoundationButton.textContent =
              "Apply";
          }

          if (applyPlusTwoButton) {
            applyPlusTwoButton.disabled =
              false;
            applyPlusTwoButton.textContent =
              "Apply";
          }

          goToCourses();

        },
        2000
      );


    } catch (error) {

      console.error(
        "Course application error:",
        error
      );

      alert(
        error.message ||
        "Unable to apply for the course."
      );


      if (applyElement) {

        applyElement.disabled = false;

        applyElement.textContent =
          "Apply";
      }
    }
  }


  /* ============================================================
     FOUNDATION CARD OPEN / CLOSE
     ============================================================ */

  if (
    foundationButton &&
    foundationList
  ) {

    foundationButton.addEventListener(
      "click",
      function () {

        const opening =
          foundationList.classList.contains(
            "hidden"
          );


        hideAllSections();

        resetSelections();

        resetSuccessMessages();

        resetMainButtons();


        if (opening) {

          foundationList.classList.remove(
            "hidden"
          );

          foundationButton.textContent =
            "✕ Close";

          foundationList.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }
    );
  }


  /* ============================================================
     FOUNDATION COURSE SELECT
     ============================================================ */

  foundationCourseButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          foundationCourseButtons.forEach(
            function (item) {

              item.classList.remove(
                "active"
              );

            }
          );


          this.classList.add(
            "active"
          );


          selectedFoundation =
            this.textContent.trim();


          if (selectedFoundationName) {

            selectedFoundationName.textContent =
              selectedFoundation;
          }


          if (selectedFoundationArea) {

            selectedFoundationArea.classList.remove(
              "hidden"
            );

            selectedFoundationArea.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }

        }
      );

    }
  );


  /* ============================================================
     FOUNDATION APPLY
     ============================================================ */

  if (applyFoundationButton) {

    applyFoundationButton.addEventListener(
      "click",
      async function () {

        await applyCourse(
          "foundation",
          selectedFoundation,
          successFoundationMessage,
          applyFoundationButton
        );

      }
    );

  }


  /* ============================================================
     ACADEMIC CARD OPEN / CLOSE
     ============================================================ */

  if (
    academicButton &&
    academicSelection
  ) {

    academicButton.addEventListener(
      "click",
      function () {

        const opening =
          academicSelection.classList.contains(
            "hidden"
          );


        hideAllSections();

        resetSelections();

        resetSuccessMessages();

        resetMainButtons();


        if (opening) {

          academicSelection.classList.remove(
            "hidden"
          );

          academicButton.textContent =
            "✕ Close";

          academicSelection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }
    );
  }


  /* ============================================================
     ACADEMIC CLASS SELECT
     ============================================================ */

  classButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          classButtons.forEach(
            function (item) {

              item.classList.remove(
                "active"
              );

            }
          );


          this.classList.add(
            "active"
          );


          selectedClass =
            this.textContent.trim();


          if (selectedClassName) {

            selectedClassName.textContent =
              selectedClass;
          }


          if (selectedClassArea) {

            selectedClassArea.classList.remove(
              "hidden"
            );

            selectedClassArea.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

          }

        }
      );

    }
  );


  /* ============================================================
     ACADEMIC APPLY
     ============================================================ */

  if (applyButton) {

    applyButton.addEventListener(
      "click",
      async function () {

        await applyCourse(
          "academic",
          selectedClass,
          successMessage,
          applyButton
        );

      }
    );

  }


  /* ============================================================
     PLUS TWO CARD OPEN / CLOSE
     ============================================================ */

  if (
    plusTwoButton &&
    plusTwoList
  ) {

    plusTwoButton.addEventListener(
      "click",
      function () {

        const opening =
          plusTwoList.classList.contains(
            "hidden"
          );


        hideAllSections();

        resetSelections();

        resetSuccessMessages();

        resetMainButtons();


        if (opening) {

          plusTwoList.classList.remove(
            "hidden"
          );

          plusTwoButton.textContent =
            "✕ Close";

          plusTwoList.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }
    );
  }


  /* ============================================================
     PLUS TWO COURSE SELECT
     ============================================================ */

  plusTwoCourseButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          plusTwoCourseButtons.forEach(
            function (item) {

              item.classList.remove(
                "active"
              );

            }
          );


          this.classList.add(
            "active"
          );


          selectedPlusTwo =
            this.textContent.trim();


          if (selectedPlusTwoName) {

            selectedPlusTwoName.textContent =
              selectedPlusTwo;
          }


          if (selectedPlusTwoArea) {

            selectedPlusTwoArea.classList.remove(
              "hidden"
            );

            selectedPlusTwoArea.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

          }

        }
      );

    }
  );


  /* ============================================================
     PLUS TWO APPLY
     ============================================================ */

  if (applyPlusTwoButton) {

    applyPlusTwoButton.addEventListener(
      "click",
      async function () {

        await applyCourse(
          "plus_two",
          selectedPlusTwo,
          successPlusTwoMessage,
          applyPlusTwoButton
        );

      }
    );

  }


  /* ============================================================
     CLOSE COURSE SECTION BUTTONS
     ============================================================ */

  document
    .querySelectorAll(
      ".close-section-btn"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const targetId =
              this.getAttribute(
                "data-close"
              );


            const target =
              document.getElementById(
                targetId
              );


            if (target) {

              target.classList.add(
                "hidden"
              );
            }


            resetSelections();

            resetSuccessMessages();

            resetMainButtons();

            goToCourses();

          }
        );

      }
    );


  /* ============================================================
     CONTACT OPEN
     ============================================================ */

  if (
    contactLink &&
    contactSection
  ) {

    contactLink.addEventListener(
      "click",
      function (event) {

        event.preventDefault();


        hideAllSections();

        resetSelections();

        resetSuccessMessages();

        resetMainButtons();


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


  /* ============================================================
     CONTACT CLOSE
     ============================================================ */

  if (closeContactButton) {

    closeContactButton.addEventListener(
      "click",
      function () {

        if (contactSection) {

          contactSection.classList.add(
            "hidden"
          );
        }


        goToCourses();

      }
    );

  }


  /* ============================================================
     ESC KEY
     ============================================================ */

  document.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Escape") {

        hideAllSections();

        resetSelections();

        resetSuccessMessages();

        resetMainButtons();

        goToCourses();

      }

    }
  );


  /* ============================================================
     INITIAL STATE
     ============================================================ */

  hideAllSections();

  resetSelections();

  resetSuccessMessages();

  resetMainButtons();

});
