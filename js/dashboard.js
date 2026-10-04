/* =========================================================
   HAND IN HAND ACADEMY
   DASHBOARD.JS
   Course Selection + Database Apply
   Notifications + Live Chat
========================================================= */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", async function () {

        /* =====================================================
           SESSION CHECK
        ===================================================== */

        try {
            const response = await fetch("/session", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                window.location.replace("login.html");
                return;
            }
        } catch (error) {
            window.location.replace("login.html");
            return;
        }

        /* =====================================================
           COURSE ELEMENTS
        ===================================================== */

        // FOUNDATION
        const foundationBtn =
            document.getElementById("foundationButton");

        const foundationList =
            document.getElementById("foundationList");

        const foundationCourseBtns =
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

        const applyFoundationBtn =
            document.getElementById(
                "applyFoundationButton"
            );

        const successFoundationMsg =
            document.getElementById(
                "successFoundationMessage"
            );


        // ACADEMIC
        const academicBtn =
            document.getElementById("academicButton");

        const academicSelection =
            document.getElementById(
                "academicSelection"
            );

        const classButtons =
            document.querySelectorAll(
                ".class-button"
            );

        const selectedArea =
            document.getElementById(
                "selectedClassArea"
            );

        const selectedName =
            document.getElementById(
                "selectedClassName"
            );

        const applyBtn =
            document.getElementById("applyButton");

        const successMsg =
            document.getElementById(
                "successMessage"
            );


        // HIGHER SECONDARY
        const plusTwoBtn =
            document.getElementById(
                "plusTwoButton"
            );

        const plusTwoList =
            document.getElementById(
                "plusTwoList"
            );

        const plusTwoCourseBtns =
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

        const applyPlusTwoBtn =
            document.getElementById(
                "applyPlusTwoButton"
            );

        const successPlusTwoMsg =
            document.getElementById(
                "successPlusTwoMessage"
            );


        /* =====================================================
           SELECTED VALUES
        ===================================================== */

        let selectedFoundation = "";
        let selectedClass = "";
        let selectedPlusTwo = "";


        /* =====================================================
           COURSE SECTION FUNCTIONS
        ===================================================== */

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


        function resetButtons() {

            if (foundationBtn) {
                foundationBtn.textContent =
                    "Select Course";
            }

            if (academicBtn) {
                academicBtn.textContent =
                    "Select Class";
            }

            if (plusTwoBtn) {
                plusTwoBtn.textContent =
                    "Select Course";
            }
        }


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
                .forEach(function (button) {

                    button.classList.remove(
                        "active"
                    );
                });


            if (selectedName) {
                selectedName.textContent = "";
            }

            if (selectedFoundationName) {
                selectedFoundationName.textContent =
                    "";
            }

            if (selectedPlusTwoName) {
                selectedPlusTwoName.textContent =
                    "";
            }


            if (selectedArea) {
                selectedArea.classList.add("hidden");
            }

            if (selectedFoundationArea) {
                selectedFoundationArea.classList.add(
                    "hidden"
                );
            }

            if (selectedPlusTwoArea) {
                selectedPlusTwoArea.classList.add(
                    "hidden"
                );
            }
        }


        function resetApplyButtons() {

            if (applyBtn) {
                applyBtn.textContent = "Apply";
                applyBtn.disabled = false;
            }

            if (applyFoundationBtn) {
                applyFoundationBtn.textContent =
                    "Apply";
                applyFoundationBtn.disabled = false;
            }

            if (applyPlusTwoBtn) {
                applyPlusTwoBtn.textContent =
                    "Apply";
                applyPlusTwoBtn.disabled = false;
            }
        }


        function autoCloseAll() {

            setTimeout(function () {

                if (successMsg) {
                    successMsg.classList.add(
                        "hidden"
                    );
                }

                if (successFoundationMsg) {
                    successFoundationMsg.classList.add(
                        "hidden"
                    );
                }

                if (successPlusTwoMsg) {
                    successPlusTwoMsg.classList.add(
                        "hidden"
                    );
                }

                hideAllSections();
                resetSelections();
                resetButtons();
                resetApplyButtons();


                const courses =
                    document.getElementById(
                        "courses"
                    );

                if (courses) {
                    courses.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            }, 2000);
        }


        /* =====================================================
           GENERIC API HELPER
        ===================================================== */

        async function apiRequest(
            url,
            options = {}
        ) {

            const response = await fetch(
                url,
                {
                    credentials: "include",
                    ...options,
                    headers: {
                        "Accept":
                            "application/json",
                        ...(options.body
                            ? {
                                "Content-Type":
                                    "application/json"
                            }
                            : {}),
                        ...(options.headers || {})
                    }
                }
            );


            let data = null;

            try {
                data = await response.json();
            } catch (error) {
                data = null;
            }


            if (!response.ok) {

                let message =
                    "Request failed.";

                if (data) {

                    message =
                        data.message ||
                        data.error ||
                        message;
                }

                throw new Error(message);
            }


            return data;
        }


        /* =====================================================
           APPLY COURSE TO DATABASE
        ===================================================== */

        async function submitCourseApplication(
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

                await apiRequest(
                    "/apply-course",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            course_type:
                                courseType,
                            course_name:
                                courseName
                        })
                    }
                );


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


                // Refresh notifications because
                // backend creates admin notification
                await loadNotifications();


                // Course application auto reply
                // will arrive through chat/WebSocket


                autoCloseAll();


            } catch (error) {

                if (applyElement) {
                    applyElement.disabled = false;
                    applyElement.textContent =
                        "Apply";
                }


                alert(
                    error.message ||
                    "Unable to submit application."
                );
            }
        }


        /* =====================================================
           FOUNDATION CARD
        ===================================================== */

        if (
            foundationBtn &&
            foundationList
        ) {

            foundationBtn.addEventListener(
                "click",
                function () {

                    const isHidden =
                        foundationList.classList.contains(
                            "hidden"
                        );


                    hideAllSections();
                    resetSelections();


                    if (isHidden) {

                        foundationList.classList.remove(
                            "hidden"
                        );

                        foundationList.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });


                        foundationBtn.textContent =
                            "✕ Close";


                        if (academicBtn) {
                            academicBtn.textContent =
                                "Select Class";
                        }

                        if (plusTwoBtn) {
                            plusTwoBtn.textContent =
                                "Select Course";
                        }

                    } else {

                        resetButtons();
                    }
                }
            );
        }


        /* =====================================================
           FOUNDATION SELECT
        ===================================================== */

        foundationCourseBtns.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        foundationCourseBtns.forEach(
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


                        if (
                            selectedFoundationName
                        ) {

                            selectedFoundationName
                                .textContent =
                                selectedFoundation;
                        }


                        if (
                            selectedFoundationArea
                        ) {

                            selectedFoundationArea
                                .classList.remove(
                                    "hidden"
                                );

                            selectedFoundationArea
                                .scrollIntoView({
                                    behavior: "smooth",
                                    block: "center"
                                });
                        }
                    }
                );
            }
        );


        /* =====================================================
           FOUNDATION APPLY
        ===================================================== */

        if (applyFoundationBtn) {

            applyFoundationBtn.addEventListener(
                "click",
                async function () {

                    await submitCourseApplication(
                        "foundation",
                        selectedFoundation,
                        successFoundationMsg,
                        applyFoundationBtn
                    );
                }
            );
        }


        /* =====================================================
           ACADEMIC CARD
        ===================================================== */

        if (
            academicBtn &&
            academicSelection
        ) {

            academicBtn.addEventListener(
                "click",
                function () {

                    const isHidden =
                        academicSelection.classList.contains(
                            "hidden"
                        );


                    hideAllSections();
                    resetSelections();


                    if (isHidden) {

                        academicSelection.classList.remove(
                            "hidden"
                        );

                        academicSelection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });


                        academicBtn.textContent =
                            "✕ Close";


                        if (foundationBtn) {
                            foundationBtn.textContent =
                                "Select Course";
                        }

                        if (plusTwoBtn) {
                            plusTwoBtn.textContent =
                                "Select Course";
                        }

                    } else {

                        resetButtons();
                    }
                }
            );
        }


        /* =====================================================
           ACADEMIC CLASS SELECT
        ===================================================== */

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


                        if (selectedName) {

                            selectedName.textContent =
                                selectedClass;
                        }


                        if (selectedArea) {

                            selectedArea.classList.remove(
                                "hidden"
                            );

                            selectedArea.scrollIntoView({
                                behavior: "smooth",
                                block: "center"
                            });
                        }
                    }
                );
            }
        );


        /* =====================================================
           ACADEMIC APPLY
        ===================================================== */

        if (applyBtn) {

            applyBtn.addEventListener(
                "click",
                async function () {

                    await submitCourseApplication(
                        "academic",
                        selectedClass,
                        successMsg,
                        applyBtn
                    );
                }
            );
        }


        /* =====================================================
           HIGHER SECONDARY CARD
        ===================================================== */

        if (
            plusTwoBtn &&
            plusTwoList
        ) {

            plusTwoBtn.addEventListener(
                "click",
                function () {

                    const isHidden =
                        plusTwoList.classList.contains(
                            "hidden"
                        );


                    hideAllSections();
                    resetSelections();


                    if (isHidden) {

                        plusTwoList.classList.remove(
                            "hidden"
                        );

                        plusTwoList.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });


                        plusTwoBtn.textContent =
                            "✕ Close";


                        if (foundationBtn) {
                            foundationBtn.textContent =
                                "Select Course";
                        }

                        if (academicBtn) {
                            academicBtn.textContent =
                                "Select Class";
                        }

                    } else {

                        resetButtons();
                    }
                }
            );
        }


        /* =====================================================
           HIGHER SECONDARY SELECT
        ===================================================== */

        plusTwoCourseBtns.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        plusTwoCourseBtns.forEach(
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


                        if (
                            selectedPlusTwoName
                        ) {

                            selectedPlusTwoName
                                .textContent =
                                selectedPlusTwo;
                        }


                        if (
                            selectedPlusTwoArea
                        ) {

                            selectedPlusTwoArea.classList
                                .remove(
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


        /* =====================================================
           HIGHER SECONDARY APPLY
        ===================================================== */

        if (applyPlusTwoBtn) {

            applyPlusTwoBtn.addEventListener(
                "click",
                async function () {

                    await submitCourseApplication(
                        "plus_two",
                        selectedPlusTwo,
                        successPlusTwoMsg,
                        applyPlusTwoBtn
                    );
                }
            );
        }


        /* =====================================================
           CLOSE BUTTONS
        ===================================================== */

        document
            .querySelectorAll(
                ".close-section-btn"
            )
            .forEach(function (button) {

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
                        resetButtons();
                        resetApplyButtons();


                        const courses =
                            document.getElementById(
                                "courses"
                            );


                        if (courses) {

                            courses.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        }
                    }
                );
            });


        /* =====================================================
           ESC KEY
        ===================================================== */

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    hideAllSections();
                    resetSelections();
                    resetButtons();
                    resetApplyButtons();
                }
            }
        );


        /* =====================================================
           NOTIFICATIONS
        ===================================================== */

        const notificationButton =
            document.getElementById(
                "notificationButton"
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


        let notifications = [];


        function getUnreadNotificationCount() {

            return notifications.filter(
                function (notification) {

                    return (
                        notification.is_read === false ||
                        notification.is_read === "false" ||
                        notification.is_read === 0
                    );
                }
            ).length;
        }


        function updateNotificationBadge() {

            const unread =
                getUnreadNotificationCount();


            if (notificationBadge) {

                if (unread > 0) {

                    notificationBadge.textContent =
                        unread > 99
                            ? "99+"
                            : String(unread);

                    notificationBadge.hidden =
                        false;

                } else {

                    notificationBadge.textContent =
                        "";

                    notificationBadge.hidden =
                        true;
                }
            }


            if (sidebarNotificationBadge) {

                if (unread > 0) {

                    sidebarNotificationBadge
                        .textContent =
                        unread > 99
                            ? "99+"
                            : String(unread);

                    sidebarNotificationBadge.hidden =
                        false;

                } else {

                    sidebarNotificationBadge
                        .textContent =
                        "";

                    sidebarNotificationBadge.hidden =
                        true;
                }
            }
        }


        function escapeHTML(value) {

            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }


        function formatNotificationDate(
            value
        ) {

            if (!value) {
                return "";
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "";
            }


            return date.toLocaleString(
                undefined,
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );
        }


        function renderNotifications() {

            if (!notificationList) {
                return;
            }


            notificationList.innerHTML = "";


            if (
                !notifications ||
                notifications.length === 0
            ) {

                if (notificationEmptyState) {
                    notificationEmptyState.classList
                        .remove("hidden");
                }

                return;
            }


            if (notificationEmptyState) {
                notificationEmptyState.classList
                    .add("hidden");
            }


            notifications.forEach(
                function (notification) {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "notification-item";


                    if (
                        notification.is_read === true ||
                        notification.is_read === "true" ||
                        notification.is_read === 1
                    ) {

                        item.classList.add(
                            "read"
                        );
                    }


                    item.innerHTML = `
                        <div class="notification-title">
                            ${escapeHTML(
                                notification.title ||
                                "Notification"
                            )}
                        </div>

                        <div class="notification-message">
                            ${escapeHTML(
                                notification.message ||
                                ""
                            )}
                        </div>

                        <div class="notification-date">
                            ${escapeHTML(
                                formatNotificationDate(
                                    notification.created_at
                                )
                            )}
                        </div>
                    `;


                    if (
                        notification.is_read === false ||
                        notification.is_read === "false" ||
                        notification.is_read === 0
                    ) {

                        item.addEventListener(
                            "click",
                            async function () {

                                await markNotificationRead(
                                    notification.id
                                );
                            }
                        );
                    }


                    notificationList.appendChild(
                        item
                    );
                }
            );
        }


        async function loadNotifications() {

            try {

                const data =
                    await apiRequest(
                        "/user/notifications",
                        {
                            method: "GET"
                        }
                    );


                notifications =
                    Array.isArray(
                        data.notifications
                    )
                        ? data.notifications
                        : Array.isArray(data)
                            ? data
                            : [];


                updateNotificationBadge();
                renderNotifications();


            } catch (error) {

                console.warn(
                    "Notifications load failed:",
                    error
                );
            }
        }


        async function markNotificationRead(
            notificationId
        ) {

            if (!notificationId) {
                return;
            }


            try {

                await apiRequest(
                    "/user/notifications/read",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            notification_id:
                                notificationId
                        })
                    }
                );


                notifications =
                    notifications.map(
                        function (item) {

                            if (
                                String(item.id) ===
                                String(notificationId)
                            ) {

                                return {
                                    ...item,
                                    is_read: true
                                };
                            }

                            return item;
                        }
                    );


                updateNotificationBadge();
                renderNotifications();


            } catch (error) {

                console.warn(
                    "Notification read failed:",
                    error
                );
            }
        }


        function openNotificationPanel() {

            if (!notificationPanel) {
                return;
            }

            notificationPanel.classList.remove(
                "hidden"
            );

            loadNotifications();
        }


        function closeNotificationPanel() {

            if (!notificationPanel) {
                return;
            }

            notificationPanel.classList.add(
                "hidden"
            );
        }


        if (notificationButton) {

            notificationButton.addEventListener(
                "click",
                function () {

                    if (
                        notificationPanel &&
                        notificationPanel.classList
                            .contains("hidden")
                    ) {

                        openNotificationPanel();

                    } else {

                        closeNotificationPanel();
                    }
                }
            );
        }


        if (sidebarNotificationButton) {

            sidebarNotificationButton.addEventListener(
                "click",
                function () {

                    openNotificationPanel();
                }
            );
        }


        if (closeNotificationButton) {

            closeNotificationButton.addEventListener(
                "click",
                function () {

                    closeNotificationPanel();
                }
            );
        }


        /* =====================================================
           CHAT
        ===================================================== */

        const chatButton =
            document.getElementById(
                "chatButton"
            );

        const sidebarChatButton =
            document.getElementById(
                "sidebarChatButton"
            );

        const chatBadge =
            document.getElementById(
                "chatBadge"
            );

        const sidebarChatBadge =
            document.getElementById(
                "sidebarChatBadge"
            );

        const chatPanel =
            document.getElementById(
                "chatPanel"
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


        let chatSocket = null;
        let chatReconnectTimer = null;
        let renderedMessageKeys =
            new Set();
        let chatIsOpen = false;


        function websocketURL() {

            const protocol =
                window.location.protocol ===
                "https:"
                    ? "wss:"
                    : "ws:";

            return (
                protocol +
                "//" +
                window.location.host +
                "/user/chat/ws"
            );
        }


        function setChatBadge(
            count
        ) {

            const value =
                Math.max(
                    0,
                    Number(count) || 0
                );


            if (chatBadge) {

                if (value > 0) {

                    chatBadge.textContent =
                        value > 99
                            ? "99+"
                            : String(value);

                    chatBadge.hidden =
                        false;

                } else {

                    chatBadge.textContent =
                        "";

                    chatBadge.hidden =
                        true;
                }
            }


            if (sidebarChatBadge) {

                if (value > 0) {

                    sidebarChatBadge.textContent =
                        value > 99
                            ? "99+"
                            : String(value);

                    sidebarChatBadge.hidden =
                        false;

                } else {

                    sidebarChatBadge.textContent =
                        "";

                    sidebarChatBadge.hidden =
                        true;
                }
            }
        }


        function setChatStatus(
            message,
            type
        ) {

            if (!chatMessageStatus) {
                return;
            }


            chatMessageStatus.textContent =
                message || "";


            chatMessageStatus.className =
                "";


            if (type) {

                chatMessageStatus.classList.add(
                    type
                );
            }
        }


        function getMessageKey(
            message
        ) {

            if (
                message &&
                message.id !== undefined &&
                message.id !== null
            ) {

                return "id:" +
                    String(message.id);
            }


            return [
                message?.sender_type || "",
                message?.sender_id || "",
                message?.receiver_type || "",
                message?.receiver_id || "",
                message?.message || "",
                message?.created_at || ""
            ].join("|");
        }


        function isUserSender(
            message
        ) {

            const senderType =
                String(
                    message?.sender_type || ""
                ).toLowerCase();


            return (
                senderType === "user" ||
                senderType === "student"
            );
        }


        function renderChatMessage(
            message,
            forceScroll = true
        ) {

            if (
                !message ||
                !message.message
            ) {

                return;
            }


            const key =
                getMessageKey(
                    message
                );


            if (
                renderedMessageKeys.has(
                    key
                )
            ) {

                return;
            }


            renderedMessageKeys.add(
                key
            );


            if (
                chatEmptyState
            ) {

                chatEmptyState.classList.add(
                    "hidden"
                );
            }


            if (!chatMessages) {
                return;
            }


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "chat-message";


            wrapper.classList.add(
                isUserSender(message)
                    ? "chat-message-user"
                    : "chat-message-admin"
            );


            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                "chat-bubble";


            const text =
                document.createElement(
                    "div"
                );


            text.className =
                "chat-text";


            text.textContent =
                message.message;


            bubble.appendChild(
                text
            );


            if (message.created_at) {

                const time =
                    document.createElement(
                        "div"
                    );


                time.className =
                    "chat-time";


                time.textContent =
                    formatChatTime(
                        message.created_at
                    );


                bubble.appendChild(
                    time
                );
            }


            wrapper.appendChild(
                bubble
            );


            chatMessages.appendChild(
                wrapper
            );


            if (forceScroll) {

                chatMessages.scrollTop =
                    chatMessages.scrollHeight;
            }


            if (
                !chatIsOpen &&
                !isUserSender(message)
            ) {

                setChatBadge(1);
            }
        }


        function formatChatTime(
            value
        ) {

            if (!value) {
                return "";
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "";
            }


            return date.toLocaleString(
                undefined,
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );
        }


        function renderChatHistory(
            messages
        ) {

            if (!chatMessages) {
                return;
            }


            chatMessages.innerHTML = "";


            if (chatEmptyState) {

                chatEmptyState.classList.remove(
                    "hidden"
                );
            }


            renderedMessageKeys =
                new Set();


            if (
                !Array.isArray(messages) ||
                messages.length === 0
            ) {

                return;
            }


            messages.forEach(
                function (message) {

                    renderChatMessage(
                        message,
                        false
                    );
                }
            );


            chatMessages.scrollTop =
                chatMessages.scrollHeight;
        }


        async function loadChatHistory() {

            try {

                const data =
                    await apiRequest(
                        "/user/chat/messages",
                        {
                            method: "GET"
                        }
                    );


                const messages =
                    Array.isArray(
                        data.messages
                    )
                        ? data.messages
                        : Array.isArray(data)
                            ? data
                            : [];


                renderChatHistory(
                    messages
                );


            } catch (error) {

                console.warn(
                    "Chat history load failed:",
                    error
                );


                setChatStatus(
                    "Unable to load chat.",
                    "error"
                );
            }
        }


        function connectChatSocket() {

            if (
                chatSocket &&
                (
                    chatSocket.readyState ===
                    WebSocket.OPEN ||
                    chatSocket.readyState ===
                    WebSocket.CONNECTING
                )
            ) {

                return;
            }


            try {

                chatSocket =
                    new WebSocket(
                        websocketURL()
                    );


                chatSocket.addEventListener(
                    "open",
                    function () {

                        setChatStatus(
                            "Live chat connected.",
                            "success"
                        );


                        loadChatHistory();
                    }
                );


                chatSocket.addEventListener(
                    "message",
                    function (event) {

                        let data = null;


                        try {

                            data =
                                JSON.parse(
                                    event.data
                                );

                        } catch (error) {

                            return;
                        }


                        if (
                            data &&
                            data.type ===
                            "message" &&
                            data.message
                        ) {

                            renderChatMessage(
                                data.message
                            );


                            // New admin reply can also
                            // create/update notification.
                            loadNotifications();


                            if (
                                !chatIsOpen &&
                                !isUserSender(
                                    data.message
                                )
                            ) {

                                setChatBadge(1);
                            }


                            return;
                        }


                        // Some server responses may send
                        // message object directly.
                        if (
                            data &&
                            data.message &&
                            typeof data.message ===
                            "object"
                        ) {

                            renderChatMessage(
                                data.message
                            );

                            loadNotifications();
                        }
                    }
                );


                chatSocket.addEventListener(
                    "close",
                    function () {

                        setChatStatus(
                            "Chat disconnected. Reconnecting...",
                            "error"
                        );


                        scheduleChatReconnect();
                    }
                );


                chatSocket.addEventListener(
                    "error",
                    function () {

                        setChatStatus(
                            "Live chat connection error.",
                            "error"
                        );
                    }
                );


            } catch (error) {

                console.warn(
                    "WebSocket connection failed:",
                    error
                );


                scheduleChatReconnect();
            }
        }


        function scheduleChatReconnect() {

            if (chatReconnectTimer) {
                return;
            }


            chatReconnectTimer =
                setTimeout(
                    function () {

                        chatReconnectTimer =
                            null;

                        connectChatSocket();

                    },
                    3000
                );
        }


        async function sendChatMessage() {

            const message =
                chatMessageInput
                    ? chatMessageInput.value.trim()
                    : "";


            if (!message) {
                return;
            }


            if (message.length > 1000) {

                setChatStatus(
                    "Message is too long.",
                    "error"
                );

                return;
            }


            if (sendChatButton) {
                sendChatButton.disabled =
                    true;
            }


            if (chatMessageInput) {
                chatMessageInput.disabled =
                    true;
            }


            setChatStatus(
                "Sending...",
                ""
            );


            try {

                // Prefer live WebSocket.
                if (
                    chatSocket &&
                    chatSocket.readyState ===
                    WebSocket.OPEN
                ) {

                    chatSocket.send(
                        JSON.stringify({
                            type: "message",
                            message: message
                        })
                    );


                    if (chatMessageInput) {
                        chatMessageInput.value =
                            "";
                    }


                    setChatStatus(
                        "Sent",
                        "success"
                    );


                } else {

                    // REST fallback.
                    const data =
                        await apiRequest(
                            "/user/chat/messages",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    message:
                                        message
                                })
                            }
                        );


                    if (chatMessageInput) {
                        chatMessageInput.value =
                            "";
                    }


                    if (
                        data &&
                        data.message &&
                        typeof data.message ===
                        "object"
                    ) {

                        renderChatMessage(
                            data.message
                        );

                    } else {

                        await loadChatHistory();
                    }


                    setChatStatus(
                        "Sent",
                        "success"
                    );
                }


            } catch (error) {

                setChatStatus(
                    error.message ||
                    "Message could not be sent.",
                    "error"
                );


            } finally {

                if (sendChatButton) {
                    sendChatButton.disabled =
                        false;
                }

                if (chatMessageInput) {
                    chatMessageInput.disabled =
                        false;

                    chatMessageInput.focus();
                }
            }
        }


        async function markChatOpened() {

            setChatBadge(0);

            await loadChatHistory();
            connectChatSocket();
        }


        function openChatPanel() {

            if (!chatPanel) {
                return;
            }


            chatPanel.classList.remove(
                "hidden"
            );


            chatIsOpen = true;


            markChatOpened();
        }


        function closeChatPanel() {

            if (!chatPanel) {
                return;
            }


            chatPanel.classList.add(
                "hidden"
            );


            chatIsOpen = false;
        }


        if (chatButton) {

            chatButton.addEventListener(
                "click",
                function () {

                    if (
                        chatPanel &&
                        chatPanel.classList.contains(
                            "hidden"
                        )
                    ) {

                        openChatPanel();

                    } else {

                        closeChatPanel();
                    }
                }
            );
        }


        if (sidebarChatButton) {

            sidebarChatButton.addEventListener(
                "click",
                function () {

                    openChatPanel();
                }
            );
        }


        if (chatForm) {

            chatForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    sendChatMessage();
                }
            );
        }


        if (
            sendChatButton &&
            !chatForm
        ) {

            sendChatButton.addEventListener(
                "click",
                function () {

                    sendChatMessage();
                }
            );
        }


        if (chatMessageInput) {

            chatMessageInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter" &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        sendChatMessage();
                    }
                }
            );
        }


        /* =====================================================
           OUTSIDE CLICK FOR PANELS
        ===================================================== */

        document.addEventListener(
            "click",
            function (event) {

                if (
                    notificationPanel &&
                    !notificationPanel.classList
                        .contains("hidden") &&
                    !notificationPanel.contains(
                        event.target
                    ) &&
                    !(
                        notificationButton &&
                        notificationButton.contains(
                            event.target
                        )
                    ) &&
                    !(
                        sidebarNotificationButton &&
                        sidebarNotificationButton.contains(
                            event.target
                        )
                    )
                ) {

                    closeNotificationPanel();
                }


                if (
                    chatPanel &&
                    !chatPanel.classList
                        .contains("hidden") &&
                    !chatPanel.contains(
                        event.target
                    ) &&
                    !(
                        chatButton &&
                        chatButton.contains(
                            event.target
                        )
                    ) &&
                    !(
                        sidebarChatButton &&
                        sidebarChatButton.contains(
                            event.target
                        )
                    )
                ) {

                    closeChatPanel();
                }
            }
        );


        /* =====================================================
           INITIAL STATE
        ===================================================== */

        hideAllSections();
        resetSelections();
        resetButtons();
        resetApplyButtons();

        if (notificationPanel) {
            notificationPanel.classList.add(
                "hidden"
            );
        }

        if (chatPanel) {
            chatPanel.classList.add(
                "hidden"
            );
        }

        setChatBadge(0);

        await loadNotifications();

        // Start websocket early so admin
        // replies can arrive live.
        connectChatSocket();

    });
})();
