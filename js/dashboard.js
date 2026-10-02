/* HAND IN HAND ACADEMY
   Dashboard - 3 Courses + Backend Course Application
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async function () {

    /* =========================
       SESSION CHECK
    ========================== */

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
    } catch (error) {
      window.location.replace("login.html");
      return;
    }


    /* =========================
       CARD 1 - FOUNDATION
    ========================== */

    const foundationBtn =
      document.getElementById("foundationButton");

    const foundationList =
      document.getElementById("foundationList");

    const foundationCourseBtns =
      document.querySelectorAll(".foundation-course-button");

    const selectedFoundationArea =
      document.getElementById("selectedFoundationArea");

    const selectedFoundationName =
      document.getElementById("selectedFoundationName");

    const applyFoundationBtn =
      document.getElementById("applyFoundationButton");

    const successFoundationMsg =
      document.getElementById("successFoundationMessage");


    /* =========================
       CARD 2 - ACADEMIC
    ========================== */

    const academicBtn =
      document.getElementById("academicButton");

    const academicSelection =
      document.getElementById("academicSelection");

    const classButtons =
      document.querySelectorAll(".class-button");

    const selectedArea =
      document.getElementById("selectedClassArea");

    const selectedName =
      document.getElementById("selectedClassName");

    const applyBtn =
      document.getElementById("applyButton");

    const successMsg =
      document.getElementById("successMessage");


    /* =========================
       CARD 3 - HIGHER SECONDARY
    ========================== */

    const plusTwoBtn =
      document.getElementById("plusTwoButton");

    const plusTwoList =
      document.getElementById("plusTwoList");

    const plusTwoCourseBtns =
      document.querySelectorAll(".plus-two-course-button");

    const selectedPlusTwoArea =
      document.getElementById("selectedPlusTwoArea");

    const selectedPlusTwoName =
      document.getElementById("selectedPlusTwoName");

    const applyPlusTwoBtn =
      document.getElementById("applyPlusTwoButton");

    const successPlusTwoMsg =
      document.getElementById("successPlusTwoMessage");


    /* =========================
       SELECTED VALUES
    ========================== */

    let selectedFoundation = "";
    let selectedClass = "";
    let selectedPlusTwo = "";


    /* =========================
       HIDE ALL SECTIONS
    ========================== */

    function hideAllSections() {
      if (foundationList) {
        foundationList.classList.add("hidden");
      }

      if (academicSelection) {
        academicSelection.classList.add("hidden");
      }

      if (plusTwoList) {
        plusTwoList.classList.add("hidden");
      }
    }


    /* =========================
       RESET CARD BUTTONS
    ========================== */

    function resetButtons() {
      if (foundationBtn) {
        foundationBtn.textContent = "Select Course";
      }

      if (academicBtn) {
        academicBtn.textContent = "Select Class";
      }

      if (plusTwoBtn) {
        plusTwoBtn.textContent = "Select Course";
      }
    }


    /* =========================
       RESET SELECTIONS
    ========================== */

    function resetSelections() {
      selectedFoundation = "";
      selectedClass = "";
      selectedPlusTwo = "";

      document
        .querySelectorAll(
          ".foundation-course-button, .class-button, .plus-two-course-button"
        )
        .forEach(function (button) {
          button.classList.remove("active");
        });

      if (selectedName) {
        selectedName.textContent = "";
      }

      if (selectedFoundationName) {
        selectedFoundationName.textContent = "";
      }

      if (selectedPlusTwoName) {
        selectedPlusTwoName.textContent = "";
      }

      if (selectedArea) {
        selectedArea.classList.add("hidden");
      }

      if (selectedFoundationArea) {
        selectedFoundationArea.classList.add("hidden");
      }

      if (selectedPlusTwoArea) {
        selectedPlusTwoArea.classList.add("hidden");
      }
    }


    /* =========================
       SAVE LOCAL APPLICATION CACHE
       DB is the main source.
    ========================== */

    function saveLocalApplication(application) {
      try {
        const stored =
          localStorage.getItem("hih_applications") || "[]";

        const apps = JSON.parse(stored);

        if (!Array.isArray(apps)) {
          return;
        }

        apps.push(application);

        localStorage.setItem(
          "hih_applications",
          JSON.stringify(apps)
        );
      } catch (error) {
        /* Local cache failure does not affect DB application */
      }
    }


    /* =========================
       BACKEND COURSE APPLICATION
    ========================== */

    async function applyCourse(courseType, courseName) {

      const response = await fetch("/apply-course", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          course_type: courseType,
          course_name: courseName
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: "Course application successful"
        };
      }

      let message = "Application failed";

      try {
        const text = await response.text();

        if (text) {
          message = text.trim();
        }
      } catch (error) {
        /* Keep default message */
      }

      if (response.status === 401) {
        window.location.replace("login.html");
        return {
          success: false,
          message: "Unauthorized"
        };
      }

      return {
        success: false,
        message: message
      };
    }


    /* =========================
       AUTO CLOSE
    ========================== */

    function autoCloseAll() {

      setTimeout(function () {

        if (successMsg) {
          successMsg.classList.add("hidden");
        }

        if (successFoundationMsg) {
          successFoundationMsg.classList.add("hidden");
        }

        if (successPlusTwoMsg) {
          successPlusTwoMsg.classList.add("hidden");
        }

        hideAllSections();
        resetSelections();
        resetButtons();

        if (applyBtn) {
          applyBtn.textContent = "Apply";
          applyBtn.disabled = false;
        }

        if (applyFoundationBtn) {
          applyFoundationBtn.textContent = "Apply";
          applyFoundationBtn.disabled = false;
        }

        if (applyPlusTwoBtn) {
          applyPlusTwoBtn.textContent = "Apply";
          applyPlusTwoBtn.disabled = false;
        }

        const courses =
          document.getElementById("courses");

        if (courses) {
          courses.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

      }, 2000);
    }


    /* =========================
       CARD 1 - FOUNDATION
    ========================== */

    if (foundationBtn && foundationList) {

      foundationBtn.addEventListener("click", function () {

        const isHidden =
          foundationList.classList.contains("hidden");

        hideAllSections();
        resetSelections();

        if (isHidden) {

          foundationList.classList.remove("hidden");

          foundationList.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          foundationBtn.textContent = "✕ Close";

          if (academicBtn) {
            academicBtn.textContent = "Select Class";
          }

          if (plusTwoBtn) {
            plusTwoBtn.textContent = "Select Course";
          }

        } else {

          resetButtons();

        }
      });
    }


    /* =========================
       FOUNDATION COURSE SELECT
    ========================== */

    foundationCourseBtns.forEach(function (button) {

      button.addEventListener("click", function () {

        foundationCourseBtns.forEach(function (item) {
          item.classList.remove("active");
        });

        this.classList.add("active");

        selectedFoundation =
          this.textContent.trim();

        if (selectedFoundationName) {
          selectedFoundationName.textContent =
            selectedFoundation;
        }

        if (selectedFoundationArea) {

          selectedFoundationArea.classList.remove("hidden");

          selectedFoundationArea.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      });
    });


    /* =========================
       FOUNDATION APPLY
    ========================== */

    if (applyFoundationBtn) {

      applyFoundationBtn.addEventListener(
        "click",
        async function () {

          if (!selectedFoundation) {
            alert("Please select a course");
            return;
          }

          applyFoundationBtn.disabled = true;
          applyFoundationBtn.textContent = "Applying...";

          const result = await applyCourse(
            "foundation",
            selectedFoundation
          );

          if (!result.success) {

            applyFoundationBtn.disabled = false;
            applyFoundationBtn.textContent = "Apply";

            if (successFoundationMsg) {
              successFoundationMsg.classList.remove("hidden");
              successFoundationMsg.textContent =
                "❌ " + result.message;
            }

            return;
          }

          if (successFoundationMsg) {
            successFoundationMsg.classList.remove("hidden");
            successFoundationMsg.textContent =
              "✅ Applied Successfully for " +
              selectedFoundation;
          }

          saveLocalApplication({
            type: "foundation",
            course: selectedFoundation,
            at: new Date().toISOString()
          });

          applyFoundationBtn.textContent =
            "Applied ✓";

          autoCloseAll();
        }
      );
    }


    /* =========================
       CARD 2 - ACADEMIC
    ========================== */

    if (academicBtn && academicSelection) {

      academicBtn.addEventListener("click", function () {

        const isHidden =
          academicSelection.classList.contains("hidden");

        hideAllSections();
        resetSelections();

        if (isHidden) {

          academicSelection.classList.remove("hidden");

          academicSelection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          academicBtn.textContent = "✕ Close";

          if (foundationBtn) {
            foundationBtn.textContent = "Select Course";
          }

          if (plusTwoBtn) {
            plusTwoBtn.textContent = "Select Course";
          }

        } else {

          resetButtons();

        }
      });
    }


    /* =========================
       CLASS SELECT
    ========================== */

    classButtons.forEach(function (button) {

      button.addEventListener("click", function () {

        classButtons.forEach(function (item) {
          item.classList.remove("active");
        });

        this.classList.add("active");

        selectedClass =
          this.textContent.trim();

        if (selectedName) {
          selectedName.textContent =
            selectedClass;
        }

        if (selectedArea) {

          selectedArea.classList.remove("hidden");

          selectedArea.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      });
    });


    /* =========================
       ACADEMIC APPLY
    ========================== */

    if (applyBtn) {

      applyBtn.addEventListener(
        "click",
        async function () {

          if (!selectedClass) {
            alert("Please select a class");
            return;
          }

          applyBtn.disabled = true;
          applyBtn.textContent = "Applying...";

          const result = await applyCourse(
            "academic",
            selectedClass
          );

          if (!result.success) {

            applyBtn.disabled = false;
            applyBtn.textContent = "Apply";

            if (successMsg) {
              successMsg.classList.remove("hidden");
              successMsg.textContent =
                "❌ " + result.message;
            }

            return;
          }

          if (successMsg) {
            successMsg.classList.remove("hidden");
            successMsg.textContent =
              "✅ Applied Successfully for " +
              selectedClass;
          }

          saveLocalApplication({
            type: "academic",
            class: selectedClass,
            at: new Date().toISOString()
          });

          applyBtn.textContent =
            "Applied ✓";

          autoCloseAll();
        }
      );
    }


    /* =========================
       CARD 3 - HIGHER SECONDARY
    ========================== */

    if (plusTwoBtn && plusTwoList) {

      plusTwoBtn.addEventListener("click", function () {

        const isHidden =
          plusTwoList.classList.contains("hidden");

        hideAllSections();
        resetSelections();

        if (isHidden) {

          plusTwoList.classList.remove("hidden");

          plusTwoList.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          plusTwoBtn.textContent = "✕ Close";

          if (foundationBtn) {
            foundationBtn.textContent = "Select Course";
          }

          if (academicBtn) {
            academicBtn.textContent = "Select Class";
          }

        } else {

          resetButtons();

        }
      });
    }


    /* =========================
       HIGHER SECONDARY SELECT
    ========================== */

    plusTwoCourseBtns.forEach(function (button) {

      button.addEventListener("click", function () {

        plusTwoCourseBtns.forEach(function (item) {
          item.classList.remove("active");
        });

        this.classList.add("active");

        selectedPlusTwo =
          this.textContent.trim();

        if (selectedPlusTwoName) {
          selectedPlusTwoName.textContent =
            selectedPlusTwo;
        }

        if (selectedPlusTwoArea) {

          selectedPlusTwoArea.classList.remove("hidden");

          selectedPlusTwoArea.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      });
    });


    /* =========================
       HIGHER SECONDARY APPLY
    ========================== */

    if (applyPlusTwoBtn) {

      applyPlusTwoBtn.addEventListener(
        "click",
        async function () {

          if (!selectedPlusTwo) {
            alert("Please select a course");
            return;
          }

          applyPlusTwoBtn.disabled = true;
          applyPlusTwoBtn.textContent = "Applying...";

          const result = await applyCourse(
            "plus_two",
            selectedPlusTwo
          );

          if (!result.success) {

            applyPlusTwoBtn.disabled = false;
            applyPlusTwoBtn.textContent = "Apply";

            if (successPlusTwoMsg) {
              successPlusTwoMsg.classList.remove("hidden");
              successPlusTwoMsg.textContent =
                "❌ " + result.message;
            }

            return;
          }

          if (successPlusTwoMsg) {
            successPlusTwoMsg.classList.remove("hidden");
            successPlusTwoMsg.textContent =
              "✅ Applied Successfully for " +
              selectedPlusTwo;
          }

          saveLocalApplication({
            type: "plus_two",
            course: selectedPlusTwo,
            at: new Date().toISOString()
          });

          applyPlusTwoBtn.textContent =
            "Applied ✓";

          autoCloseAll();
        }
      );
    }


    /* =========================
       CLOSE BUTTONS
    ========================== */

    document
      .querySelectorAll(".close-section-btn")
      .forEach(function (button) {

        button.addEventListener("click", function () {

          const targetId =
            this.getAttribute("data-close");

          const target =
            document.getElementById(targetId);

          if (target) {
            target.classList.add("hidden");
          }

          resetSelections();
          resetButtons();

          const courses =
            document.getElementById("courses");

          if (courses) {
            courses.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        });
      });


    /* =========================
       ESC TO CLOSE ALL
    ========================== */

    document.addEventListener("keydown", function (event) {

      if (event.key === "Escape") {

        hideAllSections();
        resetSelections();
        resetButtons();

      }
    });


    /* =========================
       INITIAL STATE
    ========================== */

    hideAllSections();
    resetSelections();
    resetButtons();

  });

})();