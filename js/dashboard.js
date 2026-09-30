"use strict";

document.addEventListener("DOMContentLoaded", async function () {
  /*
   * =========================
   * SESSION PROTECTION
   * =========================
   */

  try {
    const response = await fetch("http://localhost:8080/session", {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      window.location.href = "login.html";
      return;
    }
  } catch (error) {
    window.location.href = "login.html";
    return;
  }

  /*
   * =========================
   * CARD ELEMENTS
   * =========================
   */

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

  let selectedFoundation = "";
  let selectedClass = "";
  let selectedPlusTwo = "";

  /*
   * =========================
   * HIDE ALL SECTIONS
   * =========================
   */

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

  /*
   * =========================
   * RESET BUTTONS
   * =========================
   */

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

  /*
   * =========================
   * RESET SELECTIONS
   * =========================
   */

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

  /*
   * =========================
   * AUTO CLOSE
   * =========================
   */

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

  /*
   * =========================
   * FOUNDATION
   * =========================
   */

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

  if (applyFoundationBtn) {
    applyFoundationBtn.addEventListener("click", function () {
      if (!selectedFoundation) {
        alert("Please select a course");
        return;
      }

      if (successFoundationMsg) {
        successFoundationMsg.classList.remove("hidden");

        successFoundationMsg.textContent =
          "✅ Applied Successfully for " +
          selectedFoundation;
      }

      try {
        const apps = JSON.parse(
          localStorage.getItem("hih_applications") || "[]"
        );

        apps.push({
          type: "foundation",
          course: selectedFoundation,
          at: new Date().toISOString()
        });

        localStorage.setItem(
          "hih_applications",
          JSON.stringify(apps)
        );
      } catch (error) {
        // Storage failure does not stop the UI.
      }

      applyFoundationBtn.textContent = "Applied ✓";
      applyFoundationBtn.disabled = true;

      autoCloseAll();
    });
  }

  /*
   * =========================
   * ACADEMIC
   * =========================
   */

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

  if (applyBtn) {
    applyBtn.addEventListener("click", function () {
      if (!selectedClass) {
        alert("Please select a class");
        return;
      }

      if (successMsg) {
        successMsg.classList.remove("hidden");

        successMsg.textContent =
          "✅ Applied Successfully for " +
          selectedClass;
      }

      try {
        const apps = JSON.parse(
          localStorage.getItem("hih_applications") || "[]"
        );

        apps.push({
          type: "academic",
          class: selectedClass,
          at: new Date().toISOString()
        });

        localStorage.setItem(
          "hih_applications",
          JSON.stringify(apps)
        );
      } catch (error) {
        // Storage failure does not stop the UI.
      }

      applyBtn.textContent = "Applied ✓";
      applyBtn.disabled = true;

      autoCloseAll();
    });
  }

  /*
   * =========================
   * HIGHER SECONDARY
   * =========================
   */

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

  if (applyPlusTwoBtn) {
    applyPlusTwoBtn.addEventListener("click", function () {
      if (!selectedPlusTwo) {
        alert("Please select a course");
        return;
      }

      if (successPlusTwoMsg) {
        successPlusTwoMsg.classList.remove("hidden");

        successPlusTwoMsg.textContent =
          "✅ Applied Successfully for " +
          selectedPlusTwo;
      }

      try {
        const apps = JSON.parse(
          localStorage.getItem("hih_applications") || "[]"
        );

        apps.push({
          type: "plus_two",
          course: selectedPlusTwo,
          at: new Date().toISOString()
        });

        localStorage.setItem(
          "hih_applications",
          JSON.stringify(apps)
        );
      } catch (error) {
        // Storage failure does not stop the UI.
      }

      applyPlusTwoBtn.textContent = "Applied ✓";
      applyPlusTwoBtn.disabled = true;

      autoCloseAll();
    });
  }

  /*
   * =========================
   * CLOSE BUTTONS
   * =========================
   */

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

  /*
   * =========================
   * ESC TO CLOSE
   * =========================
   */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      hideAllSections();
      resetSelections();
      resetButtons();
    }
  });

  /*
   * =========================
   * INITIAL STATE
   * =========================
   */

  hideAllSections();
  resetSelections();
  resetButtons();
});
