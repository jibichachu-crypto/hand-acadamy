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
          window.location.href = "login.html";
          return;
        }

      } catch (error) {

        console.error("Session check failed:", error);

        window.location.href = "login.html";
        return;
      }


      /* =========================
         MAIN ELEMENTS
      ========================== */

      const courses =
        document.getElementById("courses");

      const foundationButton =
        document.getElementById("foundationButton");

      const academicButton =
        document.getElementById("academicButton");

      const plusTwoButton =
        document.getElementById("plusTwoButton");

      const foundationList =
        document.getElementById("foundationList");

      const academicSelection =
        document.getElementById("academicSelection");

      const plusTwoList =
        document.getElementById("plusTwoList");


      /* =========================
         COURSE BUTTONS
      ========================== */

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


      /* =========================
         FOUNDATION
      ========================== */

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


      /* =========================
         ACADEMIC
      ========================== */

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


      /* =========================
         PLUS TWO
      ========================== */

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


      /* =========================
         CONTACT
      ========================== */

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


      /* =====================================================
         NOTIFICATION ELEMENTS
      ===================================================== */

      const notificationButton =
        document.getElementById(
          "notificationButton"
        );

      const notificationPanel =
        document.getElementById(
          "notificationPanel"
        );

      const notificationList =
        document.getElementById(
          "notificationList"
        );

      const notificationEmptyState =
        document.getElementById(
          "notificationEmptyState"
        );

      const closeNotificationButton =
        document.getElementById(
          "closeNotificationButton"
        );

      const notificationBadge =
        document.getElementById(
          "notificationBadge"
        );

      const sidebarNotificationButton =
        document.getElementById(
          "sidebarNotificationButton"
        );

      const sidebarNotificationBadge =
        document.getElementById(
          "sidebarNotificationBadge"
        );


      /* =====================================================
         CHAT ELEMENTS
      ===================================================== */

      const chatButton =
        document.getElementById(
          "chatButton"
        );

      const chatPanel =
        document.getElementById(
          "chatPanel"
        );

      const closeChatButton =
        document.getElementById(
          "closeChatButton"
        );

      const sidebarChatButton =
        document.getElementById(
          "sidebarChatButton"
        );

      const chatMessages =
        document.getElementById(
          "chatMessages"
        );

      const chatEmptyState =
        document.getElementById(
          "chatEmptyState"
        );

      const chatForm =
        document.getElementById(
          "chatForm"
        );

      const chatMessageInput =
        document.getElementById(
          "chatMessageInput"
        );

      const sendChatButton =
        document.getElementById(
          "sendChatButton"
        );

      const chatMessageStatus =
        document.getElementById(
          "chatMessageStatus"
        );

      const chatBadge =
        document.getElementById(
          "chatBadge"
        );

      const sidebarChatBadge =
        document.getElementById(
          "sidebarChatBadge"
        );


      /* =========================
         STATE
      ========================== */

      let selectedFoundation = "";

      let selectedClass = "";

      let selectedPlusTwo = "";

      let notifications = [];

      let unreadNotificationCount = 0;

      let unreadChatCount = 0;


      /* =====================================================
         SAFE TEXT
      ===================================================== */

      function escapeHTML(value) {

        const div = document.createElement("div");

        div.textContent = value == null
          ? ""
          : String(value);

        return div.innerHTML;
      }


      /* =========================
         HIDE ALL COURSE SECTIONS
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

        if (contactSection) {
          contactSection.classList.add("hidden");
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

            button.classList.remove("active");

          }
        );


        classButtons.forEach(
          function (button) {

            button.classList.remove("active");

          }
        );


        plusTwoButtons.forEach(
          function (button) {

            button.classList.remove("active");

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
          selectedFoundationName.textContent = "";
        }

        if (selectedClassName) {
          selectedClassName.textContent = "";
        }

        if (selectedPlusTwoName) {
          selectedPlusTwoName.textContent = "";
        }
      }


      /* =========================
         RESET SUCCESS MESSAGES
      ========================== */

      function resetMessages() {

        [
          successFoundationMessage,
          successMessage,
          successPlusTwoMessage
        ].forEach(
          function (element) {

            if (!element) {
              return;
            }

            element.classList.add("hidden");

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

          foundationButton.disabled = false;

        }

        if (academicButton) {

          academicButton.textContent =
            "Select Class";

          academicButton.disabled = false;

        }

        if (plusTwoButton) {

          plusTwoButton.textContent =
            "Select Course";

          plusTwoButton.disabled = false;

        }
      }


      /* =========================
         CLOSE PANELS
      ========================== */

      function closeNotificationPanel() {

        if (notificationPanel) {

          notificationPanel.classList.add(
            "hidden"
          );

        }

        if (notificationButton) {

          notificationButton.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      }


      function closeChatPanel() {

        if (chatPanel) {

          chatPanel.classList.add(
            "hidden"
          );

        }

        if (chatButton) {

          chatButton.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      }


      /* =========================
         GO TO COURSES
      ========================== */

      function goToCourses() {

        hideAllSections();

        closeNotificationPanel();

        closeChatPanel();

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


      /* =====================================================
         UPDATE BADGE
      ===================================================== */

      function updateNotificationBadge(count) {

        const safeCount =
          Number.isFinite(count)
            ? Math.max(0, count)
            : 0;


        unreadNotificationCount =
          safeCount;


        [
          notificationBadge,
          sidebarNotificationBadge
        ].forEach(
          function (badge) {

            if (!badge) {
              return;
            }

            if (safeCount > 0) {

              badge.textContent =
                safeCount > 99
                  ? "99+"
                  : String(safeCount);

              badge.classList.remove("hidden");

            } else {

              badge.textContent = "0";

              badge.classList.add("hidden");

            }

          }
        );
      }


      function updateChatBadge(count) {

        const safeCount =
          Number.isFinite(count)
            ? Math.max(0, count)
            : 0;


        unreadChatCount =
          safeCount;


        [
          chatBadge,
          sidebarChatBadge
        ].forEach(
          function (badge) {

            if (!badge) {
              return;
            }

            if (safeCount > 0) {

              badge.textContent =
                safeCount > 99
                  ? "99+"
                  : String(safeCount);

              badge.classList.remove("hidden");

            } else {

              badge.textContent = "0";

              badge.classList.add("hidden");

            }

          }
        );
      }


      /* =====================================================
         NOTIFICATION RENDER
      ===================================================== */

      function renderNotifications() {

        if (!notificationList) {
          return;
        }


        const oldItems =
          notificationList.querySelectorAll(
            ".notification-item"
          );


        oldItems.forEach(
          function (item) {
            item.remove();
          }
        );


        if (
          !notifications ||
          notifications.length === 0
        ) {

          if (notificationEmptyState) {

            notificationEmptyState.textContent =
              "No notifications yet.";

            notificationEmptyState.classList.remove(
              "hidden"
            );

          }

          return;
        }


        if (notificationEmptyState) {

          notificationEmptyState.classList.add(
            "hidden"
          );

        }


        notifications.forEach(
          function (notification) {

            const item =
              document.createElement("article");

            item.className =
              "notification-item";


            if (
              notification.is_read === false
            ) {

              item.classList.add(
                "unread"
              );

            }


            const title =
              escapeHTML(
                notification.title ||
                "Academy Notification"
              );


            const message =
              escapeHTML(
                notification.message ||
                ""
              );


            let dateText = "";

            if (notification.created_at) {

              const date =
                new Date(
                  notification.created_at
                );

              if (!Number.isNaN(
                date.getTime()
              )) {

                dateText =
                  date.toLocaleString();

              }

            }


            item.innerHTML = `
              <div class="notification-item-content">
                <h4>${title}</h4>
                <p>${message}</p>
                ${
                  dateText
                    ? `<time>${escapeHTML(dateText)}</time>`
                    : ""
                }
              </div>
            `;


            notificationList.appendChild(
              item
            );

          }
        );
      }


      /* =====================================================
         LOAD NOTIFICATIONS
         
         Backend endpoint will be added in the
         next chat/notification backend step.
      ===================================================== */

      async function loadNotifications() {

        try {

          const response =
            await fetch(
              "/user/notifications",
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: {
                  "Accept":
                    "application/json"
                }
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
              "Unable to load notifications."
            );

          }


          const data =
            await response.json();


          notifications =
            Array.isArray(
              data.notifications
            )
              ? data.notifications
              : [];


          const unread =
            notifications.filter(
              function (item) {

                return item.is_read === false;

              }
            ).length;


          updateNotificationBadge(
            unread
          );


          renderNotifications();


        } catch (error) {

          console.warn(
            "Notifications are not available yet:",
            error.message
          );

          notifications = [];

          updateNotificationBadge(0);

          renderNotifications();

        }
      }


      /* =====================================================
         OPEN NOTIFICATIONS
      ===================================================== */

      async function openNotifications() {

        closeChatPanel();

        hideAllSections();

        resetSelections();

        resetMessages();

        resetMainButtons();


        if (!notificationPanel) {
          return;
        }


        const wasHidden =
          notificationPanel.classList.contains(
            "hidden"
          );


        if (wasHidden) {

          notificationPanel.classList.remove(
            "hidden"
          );

          if (notificationButton) {

            notificationButton.setAttribute(
              "aria-expanded",
              "true"
            );

          }

          await loadNotifications();

          notificationPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        } else {

          closeNotificationPanel();

          goToCourses();

        }
      }


      /* =====================================================
         CHAT UI
      ===================================================== */

      function addChatMessage(
        message,
        sender = "user",
        createdAt = null
      ) {

        if (!chatMessages) {
          return;
        }


        if (chatEmptyState) {

          chatEmptyState.classList.add(
            "hidden"
          );

        }


        const wrapper =
          document.createElement("div");


        wrapper.className =
          "chat-message " +
          (
            sender === "admin"
              ? "chat-message-admin"
              : "chat-message-user"
          );


        const bubble =
          document.createElement("div");


        bubble.className =
          "chat-message-bubble";


        bubble.textContent =
          message || "";


        wrapper.appendChild(
          bubble
        );


        if (createdAt) {

          const timeElement =
            document.createElement("time");

          const date =
            new Date(createdAt);

          if (!Number.isNaN(
            date.getTime()
          )) {

            timeElement.textContent =
              date.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              );

            timeElement.className =
              "chat-message-time";

            wrapper.appendChild(
              timeElement
            );

          }

        }


        chatMessages.appendChild(
          wrapper
        );


        chatMessages.scrollTop =
          chatMessages.scrollHeight;
      }


      function clearChatMessages() {

        if (!chatMessages) {
          return;
        }


        const messageElements =
          chatMessages.querySelectorAll(
            ".chat-message"
          );


        messageElements.forEach(
          function (element) {
            element.remove();
          }
        );


        if (chatEmptyState) {

          chatEmptyState.classList.remove(
            "hidden"
          );

        }
      }


      function setChatStatus(
        message,
        type = ""
      ) {

        if (!chatMessageStatus) {
          return;
        }


        chatMessageStatus.textContent =
          message || "";


        chatMessageStatus.classList.remove(
          "success",
          "error"
        );


        if (type) {

          chatMessageStatus.classList.add(
            type
          );

        }

      }


      /* =====================================================
         LOAD CHAT HISTORY
         
         Backend endpoint will be added next.
      ===================================================== */

      async function loadChatHistory() {

        try {

          const response =
            await fetch(
              "/user/chat/messages",
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: {
                  "Accept":
                    "application/json"
                }
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
              "Unable to load chat."
            );

          }


          const data =
            await response.json();


          clearChatMessages();


          const messages =
            Array.isArray(
              data.messages
            )
              ? data.messages
              : [];


          messages.forEach(
            function (message) {

              addChatMessage(
                message.message || "",
                message.sender_type === "admin"
                  ? "admin"
                  : "user",
                message.created_at || null
              );

            }
          );


          if (
            typeof data.unread_count ===
            "number"
          ) {

            updateChatBadge(
              data.unread_count
            );

          } else {

            updateChatBadge(0);

          }


        } catch (error) {

          console.warn(
            "Chat backend is not available yet:",
            error.message
          );

          clearChatMessages();

        }
      }


      /* =====================================================
         OPEN CHAT
      ===================================================== */

      async function openChat() {

        closeNotificationPanel();

        hideAllSections();

        resetSelections();

        resetMessages();

        resetMainButtons();


        if (!chatPanel) {
          return;
        }


        const wasHidden =
          chatPanel.classList.contains(
            "hidden"
          );


        if (wasHidden) {

          chatPanel.classList.remove(
            "hidden"
          );


          if (chatButton) {

            chatButton.setAttribute(
              "aria-expanded",
              "true"
            );

          }


          updateChatBadge(0);

          setChatStatus(
            "Loading messages..."
          );


          await loadChatHistory();


          setChatStatus("");


          chatPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });


          if (chatMessageInput) {

            setTimeout(
              function () {

                chatMessageInput.focus();

              },
              300
            );

          }

        } else {

          closeChatPanel();

          goToCourses();

        }
      }


      /* =====================================================
         SEND CHAT MESSAGE
         
         Backend endpoint will be added next.
      ===================================================== */

      async function sendChatMessage() {

        if (!chatMessageInput) {
          return;
        }


        const message =
          chatMessageInput.value.trim();


        if (!message) {

          setChatStatus(
            "Please type a message.",
            "error"
          );

          chatMessageInput.focus();

          return;
        }


        if (sendChatButton) {

          sendChatButton.disabled =
            true;

          sendChatButton.textContent =
            "Sending...";

        }


        setChatStatus(
          ""
        );


        try {

          const response =
            await fetch(
              "/user/chat/messages",
              {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                headers: {
                  "Content-Type":
                    "application/json",
                  "Accept":
                    "application/json"
                },
                body: JSON.stringify({
                  message: message
                })
              }
            );


          if (
            response.status === 401
          ) {

            window.location.href =
              "login.html";

            return;

          }


          const responseText =
            await response.text();


          if (!response.ok) {

            throw new Error(
              responseText ||
              "Message could not be sent."
            );

          }


          let data = {};

          try {

            data =
              JSON.parse(
                responseText
              );

          } catch (parseError) {

            data = {};

          }


          addChatMessage(
            message,
            "user",
            data.created_at || new Date().toISOString()
          );


          chatMessageInput.value = "";


          setChatStatus(
            "Message sent.",
            "success"
          );


          setTimeout(
            function () {

              setChatStatus("");

            },
            2000
          );


        } catch (error) {

          console.warn(
            "Chat message sending failed:",
            error
          );


          setChatStatus(
            "Chat service is not connected yet.",
            "error"
          );

        } finally {

          if (sendChatButton) {

            sendChatButton.disabled =
              false;

            sendChatButton.textContent =
              "Send";

          }

        }
      }


      /* =====================================================
         CHAT FORM
      ===================================================== */

      if (chatForm) {

        chatForm.addEventListener(
          "submit",
          function (event) {

            event.preventDefault();

            sendChatMessage();

          }
        );

      }


      /* =====================================================
         NOTIFICATION BUTTON EVENTS
      ===================================================== */

      if (notificationButton) {

        notificationButton.addEventListener(
          "click",
          function () {

            openNotifications();

          }
        );

      }


      if (sidebarNotificationButton) {

        sidebarNotificationButton.addEventListener(
          "click",
          function () {

            openNotifications();

          }
        );

      }


      if (closeNotificationButton) {

        closeNotificationButton.addEventListener(
          "click",
          function () {

            closeNotificationPanel();

            goToCourses();

          }
        );

      }


      /* =====================================================
         CHAT BUTTON EVENTS
      ===================================================== */

      if (chatButton) {

        chatButton.addEventListener(
          "click",
          function () {

            openChat();

          }
        );

      }


      if (sidebarChatButton) {

        sidebarChatButton.addEventListener(
          "click",
          function () {

            openChat();

          }
        );

      }


      if (closeChatButton) {

        closeChatButton.addEventListener(
          "click",
          function () {

            closeChatPanel();

            goToCourses();

          }
        );

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

          applyElement.disabled = true;

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
                cache: "no-store",
                headers: {
                  "Content-Type":
                    "application/json",
                  "Accept":
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


          /*
            Refresh notifications after
            successful course application.
          */

          await loadNotifications();


          setTimeout(
            function () {

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

            closeNotificationPanel();

            closeChatPanel();

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

            closeNotificationPanel();

            closeChatPanel();

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

            closeNotificationPanel();

            closeChatPanel();

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
         CLOSE COURSE SECTIONS
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


            if (
              button.id ===
              "closeNotificationButton"
            ) {
              return;
            }


            if (
              button.id ===
              "closeChatButton"
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


            closeNotificationPanel();

            closeChatPanel();

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
         ESC KEY
      ========================== */

      document.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key !== "Escape"
          ) {
            return;
          }


          closeNotificationPanel();

          closeChatPanel();

          goToCourses();

        }
      );


      /* =========================
         INITIAL STATE
      ========================== */

      hideAllSections();

      closeNotificationPanel();

      closeChatPanel();

      resetSelections();

      resetMessages();

      resetMainButtons();

      updateNotificationBadge(0);

      updateChatBadge(0);


      /*
        Load notification count silently.
        If backend endpoint does not exist yet,
        it safely fails without breaking dashboard.
      */

      loadNotifications();


    }
  );

})();
