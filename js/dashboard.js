(function () {

  "use strict";


  document.addEventListener(
    "DOMContentLoaded",
    async function () {


      /* =========================
         SESSION CHECK
      ========================== */

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

          window.location.href =
            "login.html";

          return;
        }

      } catch (error) {

        window.location.href =
          "login.html";

        return;
      }


      /* =========================
         ELEMENTS
      ========================== */

      const courses =
        document.getElementById("courses");

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


      const foundationButtons =
        document.querySelectorAll(
          ".foundation-course-button"
        );

      const classButtons =
        document.querySelectorAll(
          ".class-button"
        );

      const plusTwoButtons =
        document.querySelectorAll(
          ".plus-two-course-button"
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


      let selectedFoundation = "";

      let selectedClass = "";

      let selectedPlusTwo = "";


      /* =========================
         HIDE ALL
      ========================== */

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


      /* =========================
         RESET SELECTIONS
      ========================== */

      function resetSelections() {

        selectedFoundation = "";
        selectedClass = "";
        selectedPlusTwo = "";


        foundationButtons.forEach(
          function (button) {
            button.classList.remove(
              "active"
            );
          }
        );


        classButtons.forEach(
          function (button) {
            button.classList.remove(
              "active"
            );
          }
        );


        plusTwoButtons.forEach(
          function (button) {
            button.classList.remove(
              "active"
            );
          }
        );


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
      }


      /* =========================
         RESET MESSAGES
      ========================== */

      function resetMessages() {

        [
          successFoundationMessage,
          successMessage,
          successPlusTwoMessage
        ].forEach(
          function (element) {

            if (!element) return;

            element.classList.add(
              "hidden"
            );

            element.textContent = "";

          }
        );

      }


      /* =========================
         RESET MAIN BUTTONS
      ========================== */

      function resetMainButtons() {

        if (foundationButton) {
          foundationButton.textContent =
            "Select Course";

          foundationButton.disabled =
            false;
        }

        if (academicButton) {
          academicButton.textContent =
            "Select Class";

          academicButton.disabled =
            false;
        }

        if (plusTwoButton) {
          plusTwoButton.textContent =
            "Select Course";

          plusTwoButton.disabled =
            false;
        }
      }


      /* =========================
         GO TO MAIN COURSES
      ========================== */

      function goToCourses() {

        hideAllSections();

        resetSelections();

        resetMessages();

        resetMainButtons();


        if (courses) {

          courses.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }
      }


      /* =========================
         APPLY TO DATABASE
      ========================== */

      async function applyCourse(
        courseType,
        courseName,
        successElement,
        applyElement
      ) {

        if (!courseName) {

          alert(
            "Please select a course."
          );

          return;
        }


        if (applyElement) {

          applyElement.disabled =
            true;

          applyElement.textContent =
            "Applying...";
        }


        try {

          const response =
            await fetch(
              "/apply-course",
              {
                method: "POST",
                credentials: "include",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  course_type:
                    courseType,

                  course_name:
                    courseName
                })
              }
            );


          const message =
            await response.text();


          if (
            response.status === 401
          ) {

            window.location.href =
              "login.html";

            return;
          }


          if (
            response.status === 409
          ) {

            alert(
              "This course is already applied."
            );

            if (applyElement) {

              applyElement.disabled =
                false;

              applyElement.textContent =
                "Apply";
            }

            return;
          }


          if (!response.ok) {

            throw new Error(
              message ||
              "Application failed."
            );
          }


          if (successElement) {

            successElement.classList.remove(
              "hidden"
            );

            successElement.textContent =
              "✅ Applied Successfully for " +
              courseName;
          }


          if (applyElement) {

            applyElement.textContent =
              "Applied ✓";
          }


          setTimeout(
            function () {

              goToCourses();

            },
            2000
          );


        } catch (error) {

          alert(
            error.message ||
            "Application failed."
          );


          if (applyElement) {

            applyElement.disabled =
              false;

            applyElement.textContent =
              "Apply";
          }

        }

      }


      /* =========================
         FOUNDATION OPEN
      ========================== */

      if (
        foundationButton &&
        foundationList
      ) {

        foundationButton.addEventListener(
          "click",
          function () {

            const isHidden =
              foundationList.classList.contains(
                "hidden"
              );


            hideAllSections();

            resetSelections();

            resetMessages();

            resetMainButtons();


            if (isHidden) {

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


      /* =========================
         FOUNDATION SELECT
      ========================== */

      foundationButtons.forEach(
        function (button) {

          button.addEventListener(
            "click",
            function () {

              foundationButtons.forEach(
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

              }

            }
          );

        }
      );


      /* =========================
         FOUNDATION APPLY
      ========================== */

      if (applyFoundationButton) {

        applyFoundationButton.addEventListener(
          "click",
          function () {

            applyCourse(
              "foundation",
              selectedFoundation,
              successFoundationMessage,
              applyFoundationButton
            );

          }
        );

      }


      /* =========================
         ACADEMIC OPEN
      ========================== */

      if (
        academicButton &&
        academicSelection
      ) {

        academicButton.addEventListener(
          "click",
          function () {

            const isHidden =
              academicSelection.classList.contains(
                "hidden"
              );


            hideAllSections();

            resetSelections();

            resetMessages();

            resetMainButtons();


            if (isHidden) {

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


      /* =========================
         CLASS SELECT
      ========================== */

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

              }

            }
          );

        }
      );


      /* =========================
         ACADEMIC APPLY
      ========================== */

      if (applyButton) {

        applyButton.addEventListener(
          "click",
          function () {

            applyCourse(
              "academic",
              selectedClass,
              successMessage,
              applyButton
            );

          }
        );

      }


      /* =========================
         PLUS TWO OPEN
      ========================== */

      if (
        plusTwoButton &&
        plusTwoList
      ) {

        plusTwoButton.addEventListener(
          "click",
          function () {

            const isHidden =
              plusTwoList.classList.contains(
                "hidden"
              );


            hideAllSections();

            resetSelections();

            resetMessages();

            resetMainButtons();


            if (isHidden) {

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


      /* =========================
         PLUS TWO SELECT
      ========================== */

      plusTwoButtons.forEach(
        function (button) {

          button.addEventListener(
            "click",
            function () {

              plusTwoButtons.forEach(
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

              }

            }
          );

        }
      );


      /* =========================
         PLUS TWO APPLY
      ========================== */

      if (applyPlusTwoButton) {

        applyPlusTwoButton.addEventListener(
          "click",
          function () {

            applyCourse(
              "plus_two",
              selectedPlusTwo,
              successPlusTwoMessage,
              applyPlusTwoButton
            );

          }
        );

      }


      /* =========================
         CLOSE BUTTONS
      ========================== */

      document
        .querySelectorAll(
          ".close-section-btn"
        )
        .forEach(
          function (button) {

            if (
              button.id ===
              "closeContactButton"
            ) {

              return;
            }


            button.addEventListener(
              "click",
              function () {

                goToCourses();

              }
            );

          }
        );


      /* =========================
         CONTACT OPEN
      ========================== */

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

            resetMessages();

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


      /* =========================
         CONTACT CLOSE
      ========================== */

      if (closeContactButton) {

        closeContactButton.addEventListener(
          "click",
          function () {

            goToCourses();

          }
        );

      }


      /* =========================
         ESC
      ========================== */

      document.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Escape"
          ) {

            goToCourses();

          }

        }
      );


      /* =========================
         INITIAL
      ========================== */

      hideAllSections();

      resetSelections();

      resetMessages();

      resetMainButtons();

    }
  );

})();
