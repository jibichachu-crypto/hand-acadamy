"use strict";

/*
============================================================
 HAND IN HAND ACADEMY
 ADMIN.JS
============================================================

 Features:
 - Admin session protection
 - Navigation
 - Overview
 - Add Teacher
 - Teachers list
 - Students list
 - Course applications
 - Notifications
 - Remove Teacher
 - Remove Student
 - Remove Application
 - Live User <-> Admin Chat
 - WebSocket + REST fallback
============================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /* ====================================================
           ADMIN SESSION
        ==================================================== */

        try {

            const response =
                await fetch(
                    "/admin/session",
                    {
                        method: "GET",
                        credentials: "include",
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            if (!response.ok) {

                window.location.replace(
                    "/hih-control-84k7/"
                );

                return;
            }

        } catch (error) {

            window.location.replace(
                "/hih-control-84k7/"
            );

            return;
        }


        /* ====================================================
           ELEMENTS
        ==================================================== */

        const navItems =
            document.querySelectorAll(
                ".nav-item"
            );


        const sections =
            document.querySelectorAll(
                ".admin-section"
            );


        const teacherList =
            document.getElementById(
                "teacherList"
            );


        const studentList =
            document.getElementById(
                "studentList"
            );


        const applicationsList =
            document.getElementById(
                "applicationsList"
            );


        const notificationsList =
            document.getElementById(
                "notificationsList"
            );


        const addTeacherForm =
            document.getElementById(
                "addTeacherForm"
            );


        const teacherMessage =
            document.getElementById(
                "teacherMessage"
            );


        const detailsModal =
            document.getElementById(
                "detailsModal"
            );


        const detailsModalContent =
            document.getElementById(
                "detailsModalContent"
            );


        const closeDetailsModal =
            document.getElementById(
                "closeDetailsModal"
            );


        const adminLogoutButton =
            document.getElementById(
                "adminLogoutButton"
            );


        /* ====================================================
           CHAT ELEMENTS
        ==================================================== */

        const chatSearch =
            document.getElementById(
                "chatSearch"
            );


        const chatUserList =
            document.getElementById(
                "chatUserList"
            );


        const chatPersonName =
            document.getElementById(
                "chatPersonName"
            );


        const chatPersonId =
            document.getElementById(
                "chatPersonId"
            );


        const chatMessages =
            document.getElementById(
                "chatMessages"
            );


        const chatMessageInput =
            document.getElementById(
                "chatMessageInput"
            );


        const sendChatButton =
            document.getElementById(
                "sendChatButton"
            );


        /* ====================================================
           CHAT STATE
        ==================================================== */

        let chatUsers = [];

        let selectedUser = null;

        let chatSocket = null;

        let chatReconnectTimer = null;

        let chatOpening = false;

        let renderedMessageKeys =
            new Set();


        /* ====================================================
           HELPERS
        ==================================================== */

        function escapeHTML(value) {

            return String(
                value ?? ""
            )
                .replaceAll(
                    "&",
                    "&amp;"
                )
                .replaceAll(
                    "<",
                    "&lt;"
                )
                .replaceAll(
                    ">",
                    "&gt;"
                )
                .replaceAll(
                    '"',
                    "&quot;"
                )
                .replaceAll(
                    "'",
                    "&#039;"
                );
        }


        function formatLabel(key) {

            return String(key)
                .replaceAll(
                    "_",
                    " "
                )
                .replace(
                    /\b\w/g,
                    function (letter) {
                        return letter.toUpperCase();
                    }
                );
        }


        function formatDate(value) {

            if (!value) {
                return "—";
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return String(value);
            }


            return date.toLocaleString(
                undefined,
                {
                    dateStyle:
                        "medium",
                    timeStyle:
                        "short"
                }
            );
        }


        function showMessage(
            element,
            text,
            isError
        ) {

            if (!element) {
                return;
            }


            element.hidden = false;

            element.textContent =
                text;


            element.className =
                "form-message " +
                (
                    isError
                        ? "error"
                        : "success"
                );
        }


        function clearMessage(
            element
        ) {

            if (!element) {
                return;
            }


            element.hidden = true;

            element.textContent =
                "";

            element.className =
                "form-message";
        }


        async function getJSON(
            url,
            options = {}
        ) {

            const response =
                await fetch(
                    url,
                    {
                        credentials:
                            "include",

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

                            ...(options.headers ||
                                {})
                        }
                    }
                );


            let data = {};

            try {

                data =
                    await response.json();

            } catch (error) {

                data = {};
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Request failed"
                );
            }


            return data;
        }


        /* ====================================================
           NAVIGATION
        ==================================================== */

        function activateSection(
            sectionId,
            clickedNav
        ) {

            sections.forEach(
                function (section) {

                    section.classList.toggle(
                        "active-section",
                        section.id ===
                            sectionId
                    );
                }
            );


            navItems.forEach(
                function (item) {

                    item.classList.toggle(
                        "active",
                        item === clickedNav
                    );
                }
            );


            if (
                sectionId ===
                "addTeacherSection"
            ) {

                clearMessage(
                    teacherMessage
                );
            }


            if (
                sectionId ===
                "chatSection"
            ) {

                loadChatUsers();
            }
        }


        navItems.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const targetId =
                            this.getAttribute(
                                "data-section"
                            );


                        if (!targetId) {
                            return;
                        }


                        activateSection(
                            targetId,
                            this
                        );
                    }
                );
            }
        );


        /* ====================================================
           OVERVIEW
        ==================================================== */

        async function loadOverview() {

            try {

                const data =
                    await getJSON(
                        "/admin/overview"
                    );


                const values = {

                    totalStudents:
                        data.total_students ??
                        0,

                    totalTeachers:
                        data.total_teachers ??
                        0,

                    totalApplications:
                        data.total_applications ??
                        0,

                    totalNotifications:
                        data.total_notifications ??
                        0,

                    teacherCount:
                        data.total_teachers ??
                        0,

                    studentCount:
                        data.total_students ??
                        0,

                    applicationCount:
                        data.total_applications ??
                        0,

                    notificationCount:
                        data.total_notifications ??
                        0
                };


                Object.entries(
                    values
                ).forEach(
                    function (
                        [id, value]
                    ) {

                        const element =
                            document.getElementById(
                                id
                            );


                        if (element) {

                            element.textContent =
                                value;
                        }
                    }
                );


            } catch (error) {

                console.error(
                    "Overview loading failed:",
                    error
                );
            }
        }


        /* ====================================================
           ADD TEACHER
        ==================================================== */

        if (addTeacherForm) {

            addTeacherForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();


                    const nameInput =
                        document.getElementById(
                            "teacherName"
                        );


                    const subjectInput =
                        document.getElementById(
                            "teacherSubject"
                        );


                    const name =
                        nameInput
                            ? nameInput.value.trim()
                            : "";


                    const subject =
                        subjectInput
                            ? subjectInput.value.trim()
                            : "";


                    if (
                        !name ||
                        !subject
                    ) {

                        showMessage(
                            teacherMessage,
                            "Teacher name and subject are required.",
                            true
                        );

                        return;
                    }


                    const submitButton =
                        addTeacherForm.querySelector(
                            'button[type="submit"]'
                        );


                    if (submitButton) {

                        submitButton.disabled =
                            true;

                        submitButton.textContent =
                            "Adding...";
                    }


                    try {

                        const result =
                            await getJSON(
                                "/admin/teachers",
                                {
                                    method:
                                        "POST",

                                    body:
                                        JSON.stringify({
                                            name:
                                                name,

                                            subject:
                                                subject
                                        })
                                }
                            );


                        addTeacherForm.reset();


                        showMessage(
                            teacherMessage,

                            "Teacher added successfully. " +
                            "User ID: " +
                            (
                                result.teacher_id ||
                                "—"
                            ) +
                            " | Temporary Password: " +
                            (
                                result.temporary_password ||
                                "—"
                            ),

                            false
                        );


                        await Promise.all([
                            loadTeachers(),
                            loadOverview()
                        ]);


                        if (nameInput) {
                            nameInput.focus();
                        }


                    } catch (error) {

                        showMessage(
                            teacherMessage,

                            error.message ||
                            "Unable to add teacher.",

                            true
                        );


                    } finally {

                        if (submitButton) {

                            submitButton.disabled =
                                false;

                            submitButton.textContent =
                                "Add Teacher";
                        }
                    }
                }
            );
        }


        /* ====================================================
           LOAD TEACHERS
        ==================================================== */

        async function loadTeachers() {

            if (!teacherList) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/teachers"
                    );


                const teachers =
                    Array.isArray(
                        data.teachers
                    )
                        ? data.teachers
                        : [];


                teacherList.innerHTML =
                    "";


                if (
                    teachers.length === 0
                ) {

                    teacherList.innerHTML =
                        '<div class="empty-state">' +
                        "No teachers added yet." +
                        "</div>";

                    return;
                }


                teachers.forEach(
                    function (teacher) {

                        const card =
                            document.createElement(
                                "div"
                            );


                        card.className =
                            "data-card";


                        card.innerHTML = `
                            <div class="data-card-top">

                                <div>

                                    <div class="data-card-title">
                                        ${escapeHTML(
                                            teacher.name
                                        )}
                                    </div>

                                    <div class="data-card-subtitle">
                                        ${escapeHTML(
                                            teacher.subject
                                        )}
                                    </div>

                                </div>

                                <span class="status-badge">
                                    ${escapeHTML(
                                        teacher.status ||
                                        "active"
                                    )}
                                </span>

                            </div>

                            <div class="data-card-meta">

                                <span>
                                    User ID:
                                    ${escapeHTML(
                                        teacher.teacher_id
                                    )}
                                </span>

                                <span>
                                    Created:
                                    ${escapeHTML(
                                        formatDate(
                                            teacher.created_at
                                        )
                                    )}
                                </span>

                            </div>
                        `;


                        card.addEventListener(
                            "click",
                            function () {

                                openDetails(
                                    "Teacher Details",
                                    teacher,
                                    "teacher"
                                );
                            }
                        );


                        teacherList.appendChild(
                            card
                        );
                    }
                );


            } catch (error) {

                teacherList.innerHTML =
                    '<div class="empty-state">' +
                    escapeHTML(
                        error.message ||
                        "Unable to load teachers."
                    ) +
                    "</div>";
            }
        }


        /* ====================================================
           LOAD STUDENTS
        ==================================================== */

        async function loadStudents() {

            if (!studentList) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/students"
                    );


                const students =
                    Array.isArray(
                        data.students
                    )
                        ? data.students
                        : [];


                studentList.innerHTML =
                    "";


                if (
                    students.length === 0
                ) {

                    studentList.innerHTML =
                        '<div class="empty-state">' +
                        "No students registered yet." +
                        "</div>";

                    return;
                }


                students.forEach(
                    function (student) {

                        const card =
                            document.createElement(
                                "div"
                            );


                        card.className =
                            "data-card";


                        card.innerHTML = `
                            <div class="data-card-top">

                                <div>

                                    <div class="data-card-title">
                                        ${escapeHTML(
                                            student.name
                                        )}
                                    </div>

                                    <div class="data-card-subtitle">
                                        User ID:
                                        ${escapeHTML(
                                            student.user_id
                                        )}
                                    </div>

                                </div>

                                <span class="status-badge">
                                    ${escapeHTML(
                                        student.status ||
                                        "active"
                                    )}
                                </span>

                            </div>

                            <div class="data-card-meta">

                                <span>
                                    ${escapeHTML(
                                        student.email
                                    )}
                                </span>

                                <span>
                                    ${escapeHTML(
                                        student.phone
                                    )}
                                </span>

                            </div>
                        `;


                        card.addEventListener(
                            "click",
                            function () {

                                openDetails(
                                    "Student Details",
                                    student,
                                    "student"
                                );
                            }
                        );


                        studentList.appendChild(
                            card
                        );
                    }
                );


            } catch (error) {

                studentList.innerHTML =
                    '<div class="empty-state">' +
                    escapeHTML(
                        error.message ||
                        "Unable to load students."
                    ) +
                    "</div>";
            }
        }


        /* ====================================================
           LOAD APPLICATIONS
        ==================================================== */

        async function loadApplications() {

            if (!applicationsList) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/applications"
                    );


                const applications =
                    Array.isArray(
                        data.applications
                    )
                        ? data.applications
                        : [];


                applicationsList.innerHTML =
                    "";


                if (
                    applications.length === 0
                ) {

                    applicationsList.innerHTML =
                        '<div class="empty-state">' +
                        "No course applications yet." +
                        "</div>";

                    return;
                }


                applications.forEach(
                    function (application) {

                        const card =
                            document.createElement(
                                "div"
                            );


                        card.className =
                            "data-card";


                        card.innerHTML = `
                            <div class="data-card-top">

                                <div>

                                    <div class="data-card-title">
                                        ${escapeHTML(
                                            application.student_name ||
                                            "Student"
                                        )}
                                    </div>

                                    <div class="data-card-subtitle">
                                        ${escapeHTML(
                                            application.course_name
                                        )}
                                    </div>

                                </div>

                                <span class="status-badge">
                                    ${escapeHTML(
                                        application.status ||
                                        "Pending"
                                    )}
                                </span>

                            </div>

                            <div class="data-card-meta">

                                <span>
                                    User ID:
                                    ${escapeHTML(
                                        application.user_id
                                    )}
                                </span>

                                <span>
                                    Type:
                                    ${escapeHTML(
                                        application.course_type
                                    )}
                                </span>

                            </div>
                        `;


                        card.addEventListener(
                            "click",
                            function () {

                                openDetails(
                                    "Course Application",
                                    application,
                                    "application"
                                );
                            }
                        );


                        applicationsList.appendChild(
                            card
                        );
                    }
                );


            } catch (error) {

                applicationsList.innerHTML =
                    '<div class="empty-state">' +
                    escapeHTML(
                        error.message ||
                        "Unable to load applications."
                    ) +
                    "</div>";
            }
        }


        /* ====================================================
           LOAD NOTIFICATIONS
        ==================================================== */

        async function loadNotifications() {

            if (!notificationsList) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/notifications"
                    );


                const notifications =
                    Array.isArray(
                        data.notifications
                    )
                        ? data.notifications
                        : [];


                notificationsList.innerHTML =
                    "";


                if (
                    notifications.length === 0
                ) {

                    notificationsList.innerHTML =
                        '<div class="empty-state">' +
                        "No new notifications." +
                        "</div>";

                    return;
                }


                notifications.forEach(
                    function (notification) {

                        const card =
                            document.createElement(
                                "div"
                            );


                        card.className =
                            "data-card";


                        card.innerHTML = `
                            <div class="data-card-title">
                                ${escapeHTML(
                                    notification.title ||
                                    notification.event_type ||
                                    "Notification"
                                )}
                            </div>

                            <div class="data-card-subtitle">
                                ${escapeHTML(
                                    notification.message ||
                                    ""
                                )}
                            </div>

                            <div class="data-card-meta">

                                <span>
                                    User ID:
                                    ${escapeHTML(
                                        notification.user_id ||
                                        "—"
                                    )}
                                </span>

                                <span>
                                    ${escapeHTML(
                                        formatDate(
                                            notification.created_at
                                        )
                                    )}
                                </span>

                            </div>
                        `;


                        card.addEventListener(
                            "click",
                            function () {

                                openDetails(
                                    "Notification",
                                    notification,
                                    "notification"
                                );
                            }
                        );


                        notificationsList.appendChild(
                            card
                        );
                    }
                );


            } catch (error) {

                notificationsList.innerHTML =
                    '<div class="empty-state">' +
                    escapeHTML(
                        error.message ||
                        "Unable to load notifications."
                    ) +
                    "</div>";
            }
        }


        /* ====================================================
           DETAILS MODAL
        ==================================================== */

        function openDetails(
            title,
            data,
            detailType
        ) {

            if (
                !detailsModal ||
                !detailsModalContent
            ) {
                return;
            }


            const hiddenKeys =
                new Set([
                    "password",
                    "password_hash",
                    "temporary_password"
                ]);


            const removalConfig = {

                teacher: {

                    label:
                        "Remove Teacher",

                    confirmLabel:
                        "Confirm Remove",

                    url:
                        function (item) {

                            return (
                                "/admin/teachers?teacher_id=" +
                                encodeURIComponent(
                                    String(
                                        item.teacher_id ||
                                        ""
                                    ).trim()
                                )
                            );
                        },

                    refresh:
                        async function () {

                            await Promise.all([
                                loadTeachers(),
                                loadOverview()
                            ]);
                        }
                },


                student: {

                    label:
                        "Remove Student",

                    confirmLabel:
                        "Confirm Remove",

                    url:
                        function (item) {

                            return (
                                "/admin/students?user_id=" +
                                encodeURIComponent(
                                    String(
                                        item.user_id ||
                                        ""
                                    ).trim()
                                )
                            );
                        },

                    refresh:
                        async function () {

                            await Promise.all([
                                loadStudents(),
                                loadApplications(),
                                loadOverview(),
                                loadChatUsers()
                            ]);
                        }
                },


                application: {

                    label:
                        "Remove Application",

                    confirmLabel:
                        "Confirm Remove",

                    url:
                        function (item) {

                            return (
                                "/admin/applications?user_id=" +
                                encodeURIComponent(
                                    String(
                                        item.user_id ||
                                        ""
                                    ).trim()
                                ) +
                                "&course_type=" +
                                encodeURIComponent(
                                    String(
                                        item.course_type ||
                                        ""
                                    ).trim()
                                ) +
                                "&course_name=" +
                                encodeURIComponent(
                                    String(
                                        item.course_name ||
                                        ""
                                    ).trim()
                                )
                            );
                        },

                    refresh:
                        async function () {

                            await Promise.all([
                                loadApplications(),
                                loadOverview()
                            ]);
                        }
                }
            };


            let html = `
                <h2>
                    ${escapeHTML(title)}
                </h2>
            `;


            Object.entries(
                data || {}
            ).forEach(
                function (
                    [key, value]
                ) {

                    if (
                        hiddenKeys.has(
                            key
                        )
                    ) {

                        return;
                    }


                    if (
                        value === null ||
                        value === undefined ||
                        value === ""
                    ) {

                        value = "—";
                    }


                    html += `
                        <div class="detail-row">

                            <div class="detail-label">
                                ${escapeHTML(
                                    formatLabel(
                                        key
                                    )
                                )}
                            </div>

                            <div class="detail-value">
                                ${escapeHTML(
                                    value
                                )}
                            </div>

                        </div>
                    `;
                }
            );


            const config =
                removalConfig[
                    detailType
                ];


            const canRemove =
                !!config &&
                !!data &&
                (
                    (
                        detailType ===
                            "teacher" &&
                        data.teacher_id
                    ) ||
                    (
                        (
                            detailType ===
                                "student" ||
                            detailType ===
                                "application"
                        ) &&
                        data.user_id
                    )
                );


            if (canRemove) {

                html += `
                    <div
                        style="
                            margin-top:24px;
                            padding-top:18px;
                            border-top:1px solid #e5e7eb;
                        "
                    >

                        <button
                            type="button"
                            id="removeEntityButton"
                            style="
                                width:100%;
                                padding:12px 16px;
                                border:0;
                                border-radius:10px;
                                background:#dc2626;
                                color:#ffffff;
                                font-weight:700;
                                cursor:pointer;
                            "
                        >
                            ${escapeHTML(
                                config.label
                            )}
                        </button>

                        <div
                            id="removeConfirmHint"
                            hidden
                            style="
                                margin-top:10px;
                                text-align:center;
                                color:#991b1b;
                                font-size:13px;
                                font-weight:600;
                            "
                        >
                            Click again to confirm removal.
                        </div>

                    </div>
                `;
            }


            detailsModalContent.innerHTML =
                html;


            detailsModal.hidden =
                false;


            const removeButton =
                document.getElementById(
                    "removeEntityButton"
                );


            const removeConfirmHint =
                document.getElementById(
                    "removeConfirmHint"
                );


            if (
                !removeButton ||
                !canRemove
            ) {

                return;
            }


            removeButton.addEventListener(
                "click",
                async function () {

                    if (
                        removeButton.dataset
                            .confirmed !==
                        "true"
                    ) {

                        removeButton.dataset
                            .confirmed =
                            "true";

                        removeButton.textContent =
                            config.confirmLabel;

                        removeButton.style
                            .background =
                            "#991b1b";


                        if (
                            removeConfirmHint
                        ) {

                            removeConfirmHint.hidden =
                                false;
                        }


                        return;
                    }


                    removeButton.disabled =
                        true;

                    removeButton.textContent =
                        "Removing...";


                    try {

                        const result =
                            await getJSON(
                                config.url(
                                    data
                                ),
                                {
                                    method:
                                        "DELETE"
                                }
                            );


                        detailsModal.hidden =
                            true;


                        await config.refresh();


                        window.alert(
                            result.message ||
                            "Removed successfully."
                        );


                    } catch (error) {

                        window.alert(
                            error.message ||
                            "Unable to remove."
                        );


                        removeButton.disabled =
                            false;

                        removeButton.textContent =
                            config.confirmLabel;

                        removeButton.style
                            .background =
                            "#991b1b";
                    }
                }
            );
        }


        /* ====================================================
           CLOSE MODAL
        ==================================================== */

        if (closeDetailsModal) {

            closeDetailsModal.addEventListener(
                "click",
                function () {

                    if (detailsModal) {

                        detailsModal.hidden =
                            true;
                    }
                }
            );
        }


        if (detailsModal) {

            detailsModal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        detailsModal
                    ) {

                        detailsModal.hidden =
                            true;
                    }
                }
            );
        }


        /* ====================================================
           LOGOUT
        ==================================================== */

        if (adminLogoutButton) {

            adminLogoutButton.addEventListener(
                "click",
                async function () {

                    adminLogoutButton.disabled =
                        true;


                    adminLogoutButton.textContent =
                        "Logging out...";


                    try {

                        await fetch(
                            "/admin/logout",
                            {
                                method:
                                    "POST",

                                credentials:
                                    "include"
                            }
                        );

                    } catch (error) {

                        // Redirect anyway.
                    }


                    if (chatSocket) {

                        try {
                            chatSocket.close();
                        } catch (error) {
                            // Ignore.
                        }
                    }


                    window.location.replace(
                        "/hih-control-84k7/"
                    );
                }
            );
        }


        /* ====================================================
           CHAT HELPERS
        ==================================================== */

        function chatWebSocketURL(
            userId
        ) {

            const protocol =
                window.location.protocol ===
                "https:"
                    ? "wss:"
                    : "ws:";


            return (
                protocol +
                "//" +
                window.location.host +
                "/admin/chat/ws?user_id=" +
                encodeURIComponent(
                    String(userId)
                )
            );
        }


        function getUserId(
            user
        ) {

            return (
                user?.user_id ??
                user?.id ??
                ""
            );
        }


        function getUserName(
            user
        ) {

            return (
                user?.name ||
                user?.student_name ||
                user?.email ||
                "Student"
            );
        }


        function getMessageKey(
            message
        ) {

            if (
                message &&
                message.id !==
                    undefined &&
                message.id !== null
            ) {

                return (
                    "id:" +
                    String(message.id)
                );
            }


            return [
                message?.sender_type ||
                    "",
                message?.sender_id ||
                    "",
                message?.receiver_type ||
                    "",
                message?.receiver_id ||
                    "",
                message?.message ||
                    "",
                message?.created_at ||
                    ""
            ].join("|");
        }


        function isAdminMessage(
            message
        ) {

            const sender =
                String(
                    message?.sender_type ||
                    ""
                ).toLowerCase();


            return (
                sender === "admin"
            );
        }


        function renderChatMessage(
            message,
            scrollToBottom
        ) {

            if (
                !message ||
                !message.message ||
                !chatMessages
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
                chatMessages.querySelector(
                    ".empty-state"
                )
            ) {

                chatMessages.innerHTML =
                    "";
            }


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "chat-message";


            wrapper.classList.add(
                isAdminMessage(
                    message
                )
                    ? "chat-message-admin"
                    : "chat-message-user"
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


            if (
                message.created_at
            ) {

                const time =
                    document.createElement(
                        "div"
                    );


                time.className =
                    "chat-time";


                time.textContent =
                    formatDate(
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


            if (
                scrollToBottom !==
                false
            ) {

                chatMessages.scrollTop =
                    chatMessages.scrollHeight;
            }
        }


        function renderChatHistory(
            messages
        ) {

            if (!chatMessages) {
                return;
            }


            chatMessages.innerHTML =
                "";


            renderedMessageKeys =
                new Set();


            if (
                !Array.isArray(
                    messages
                ) ||
                messages.length === 0
            ) {

                chatMessages.innerHTML =
                    '<div class="empty-state">' +
                    "No messages yet. Start chatting." +
                    "</div>";

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


        /* ====================================================
           LOAD CHAT USERS
        ==================================================== */

        async function loadChatUsers() {

            if (!chatUserList) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/chat/users"
                    );


                chatUsers =
                    Array.isArray(
                        data.users
                    )
                        ? data.users
                        : Array.isArray(data)
                            ? data
                            : [];


                renderChatUserList();


            } catch (error) {

                chatUserList.innerHTML =
                    '<div class="empty-state">' +
                    escapeHTML(
                        error.message ||
                        "Unable to load users."
                    ) +
                    "</div>";
            }
        }


        /* ====================================================
           RENDER CHAT USERS
        ==================================================== */

        function renderChatUserList() {

            if (!chatUserList) {
                return;
            }


            const search =
                chatSearch
                    ? chatSearch.value
                        .trim()
                        .toLowerCase()
                    : "";


            const filtered =
                chatUsers.filter(
                    function (user) {

                        const id =
                            String(
                                getUserId(
                                    user
                                )
                            ).toLowerCase();


                        const name =
                            String(
                                getUserName(
                                    user
                                )
                            ).toLowerCase();


                        const email =
                            String(
                                user?.email ||
                                ""
                            ).toLowerCase();


                        return (
                            !search ||
                            id.includes(
                                search
                            ) ||
                            name.includes(
                                search
                            ) ||
                            email.includes(
                                search
                            )
                        );
                    }
                );


            chatUserList.innerHTML =
                "";


            if (
                filtered.length ===
                0
            ) {

                chatUserList.innerHTML =
                    '<div class="empty-state">' +
                    (
                        search
                            ? "No matching users."
                            : "No users available."
                    ) +
                    "</div>";

                return;
            }


            filtered.forEach(
                function (user) {

                    const userId =
                        getUserId(
                            user
                        );


                    const card =
                        document.createElement(
                            "button"
                        );


                    card.type =
                        "button";


                    card.className =
                        "chat-user-card";


                    if (
                        selectedUser &&
                        String(
                            getUserId(
                                selectedUser
                            )
                        ) ===
                        String(
                            userId
                        )
                    ) {

                        card.classList.add(
                            "active"
                        );
                    }


                    card.innerHTML = `
                        <div class="chat-user-name">
                            ${escapeHTML(
                                getUserName(
                                    user
                                )
                            )}
                        </div>

                        <div class="chat-user-id">
                            User ID:
                            ${escapeHTML(
                                userId
                            )}
                        </div>

                        ${
                            user?.email
                                ? `
                            <div class="chat-user-email">
                                ${escapeHTML(
                                    user.email
                                )}
                            </div>
                        `
                                : ""
                        }
                    `;


                    card.addEventListener(
                        "click",
                        async function () {

                            await selectChatUser(
                                user
                            );
                        }
                    );


                    chatUserList.appendChild(
                        card
                    );
                }
            );
        }


        /* ====================================================
           SELECT CHAT USER
        ==================================================== */

        async function selectChatUser(
            user
        ) {

            const userId =
                getUserId(
                    user
                );


            if (!userId) {

                return;
            }


            selectedUser =
                user;


            renderChatUserList();


            if (chatPersonName) {

                chatPersonName.textContent =
                    getUserName(
                        user
                    );
            }


            if (chatPersonId) {

                chatPersonId.textContent =
                    "User ID: " +
                    userId;
            }


            if (chatMessages) {

                chatMessages.innerHTML =
                    '<div class="empty-state">' +
                    "Loading messages..." +
                    "</div>";
            }


            renderedMessageKeys =
                new Set();


            await loadChatHistory(
                userId
            );


            connectChatSocket(
                userId
            );
        }


        /* ====================================================
           LOAD CHAT HISTORY
        ==================================================== */

        async function loadChatHistory(
            userId
        ) {

            if (!userId) {
                return;
            }


            try {

                const data =
                    await getJSON(
                        "/admin/chat/messages?user_id=" +
                        encodeURIComponent(
                            String(userId)
                        )
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

                if (chatMessages) {

                    chatMessages.innerHTML =
                        '<div class="empty-state">' +
                        escapeHTML(
                            error.message ||
                            "Unable to load chat messages."
                        ) +
                        "</div>";
                }
            }
        }


        /* ====================================================
           CLOSE OLD CHAT SOCKET
        ==================================================== */

        function closeChatSocket() {

            if (
                chatSocket
            ) {

                try {

                    chatSocket.onclose =
                        null;

                    chatSocket.close();

                } catch (error) {

                    // Ignore.
                }


                chatSocket =
                    null;
            }
        }


        /* ====================================================
           CONNECT ADMIN WEBSOCKET
        ==================================================== */

        function connectChatSocket(
            userId
        ) {

            if (!userId) {
                return;
            }


            closeChatSocket();


            try {

                chatSocket =
                    new WebSocket(
                        chatWebSocketURL(
                            userId
                        )
                    );


                chatSocket.addEventListener(
                    "open",
                    function () {

                        chatOpening =
                            false;
                    }
                );


                chatSocket.addEventListener(
                    "message",
                    function (event) {

                        let data =
                            null;


                        try {

                            data =
                                JSON.parse(
                                    event.data
                                );

                        } catch (error) {

                            return;
                        }


                        /*
                        Expected:
                        {
                            type: "message",
                            message: {...}
                        }
                        */

                        let incoming =
                            null;


                        if (
                            data &&
                            data.type ===
                                "message" &&
                            data.message
                        ) {

                            incoming =
                                data.message;

                        } else if (
                            data &&
                            data.message &&
                            typeof
                                data.message ===
                                "object"
                        ) {

                            incoming =
                                data.message;
                        }


                        if (!incoming) {
                            return;
                        }


                        const incomingUserId =
                            String(
                                incoming.sender_type ===
                                    "user"
                                    ? incoming.sender_id
                                    : incoming.receiver_id
                            );


                        /*
                        Show only selected user's
                        conversation.
                        */

                        if (
                            String(
                                userId
                            ) ===
                            incomingUserId
                        ) {

                            renderChatMessage(
                                incoming,
                                true
                            );
                        }


                        /*
                        Refresh users so a newly
                        active student remains visible.
                        */

                        loadChatUsers();
                    }
                );


                chatSocket.addEventListener(
                    "close",
                    function () {

                        if (
                            selectedUser &&
                            String(
                                getUserId(
                                    selectedUser
                                )
                            ) ===
                            String(
                                userId
                            )
                        ) {

                            scheduleChatReconnect(
                                userId
                            );
                        }
                    }
                );


                chatSocket.addEventListener(
                    "error",
                    function () {

                        console.warn(
                            "Admin chat WebSocket error"
                        );
                    }
                );


            } catch (error) {

                console.warn(
                    "WebSocket connection failed:",
                    error
                );


                scheduleChatReconnect(
                    userId
                );
            }
        }


        /* ====================================================
           RECONNECT
        ==================================================== */

        function scheduleChatReconnect(
            userId
        ) {

            if (
                chatReconnectTimer ||
                !userId
            ) {

                return;
            }


            chatReconnectTimer =
                setTimeout(
                    function () {

                        chatReconnectTimer =
                            null;


                        if (
                            selectedUser &&
                            String(
                                getUserId(
                                    selectedUser
                                )
                            ) ===
                            String(
                                userId
                            )
                        ) {

                            connectChatSocket(
                                userId
                            );
                        }

                    },
                    3000
                );
        }


        /* ====================================================
           SEND CHAT MESSAGE
        ==================================================== */

        async function sendChatMessage() {

            if (!selectedUser) {

                window.alert(
                    "Please select a student first."
                );

                return;
            }


            const userId =
                getUserId(
                    selectedUser
                );


            const message =
                chatMessageInput
                    ? chatMessageInput.value.trim()
                    : "";


            if (!message) {
                return;
            }


            if (
                message.length >
                1000
            ) {

                window.alert(
                    "Message is too long."
                );

                return;
            }


            if (sendChatButton) {

                sendChatButton.disabled =
                    true;

                sendChatButton.textContent =
                    "Sending...";
            }


            if (chatMessageInput) {

                chatMessageInput.disabled =
                    true;
            }


            try {

                /*
                Preferred:
                WebSocket
                */

                if (
                    chatSocket &&
                    chatSocket.readyState ===
                    WebSocket.OPEN
                ) {

                    chatSocket.send(
                        JSON.stringify({
                            type:
                                "message",

                            message:
                                message,

                            user_id:
                                Number(
                                    userId
                                )
                        })
                    );


                } else {

                    /*
                    REST fallback
                    */

                    const result =
                        await getJSON(
                            "/admin/chat/messages",
                            {
                                method:
                                    "POST",

                                body:
                                    JSON.stringify({
                                        user_id:
                                            Number(
                                                userId
                                            ),

                                        message:
                                            message
                                    })
                            }
                        );


                    if (
                        result &&
                        result.message &&
                        typeof
                            result.message ===
                            "object"
                    ) {

                        renderChatMessage(
                            result.message,
                            true
                        );

                    } else {

                        await loadChatHistory(
                            userId
                        );
                    }
                }


                if (chatMessageInput) {

                    chatMessageInput.value =
                        "";
                }


            } catch (error) {

                window.alert(
                    error.message ||
                    "Message could not be sent."
                );


            } finally {

                if (sendChatButton) {

                    sendChatButton.disabled =
                        false;

                    sendChatButton.textContent =
                        "Send";
                }


                if (chatMessageInput) {

                    chatMessageInput.disabled =
                        false;

                    chatMessageInput.focus();
                }
            }
        }


        /* ====================================================
           CHAT SEND BUTTON
        ==================================================== */

        if (
            sendChatButton
        ) {

            sendChatButton.addEventListener(
                "click",
                function () {

                    sendChatMessage();
                }
            );
        }


        /* ====================================================
           CHAT ENTER KEY
        ==================================================== */

        if (
            chatMessageInput
        ) {

            chatMessageInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        sendChatMessage();
                    }
                }
            );
        }


        /* ====================================================
           CHAT SEARCH
        ==================================================== */

        if (chatSearch) {

            chatSearch.addEventListener(
                "input",
                function () {

                    renderChatUserList();
                }
            );
        }


        /* ====================================================
           CLEANUP SOCKET
        ==================================================== */

        window.addEventListener(
            "beforeunload",
            function () {

                if (
                    chatReconnectTimer
                ) {

                    clearTimeout(
                        chatReconnectTimer
                    );
                }


                if (chatSocket) {

                    try {
                        chatSocket.close();
                    } catch (error) {
                        // Ignore.
                    }
                }
            }
        );


        /* ====================================================
           INITIAL LOAD
        ==================================================== */

        clearMessage(
            teacherMessage
        );


        await loadOverview();

        await loadTeachers();

        await loadStudents();

        await loadApplications();

        await loadNotifications();

        await loadChatUsers();


        /* ====================================================
           DEFAULT SECTION
        ==================================================== */

        const initialSection =
            document.querySelector(
                ".admin-section.active-section"
            );


        if (!initialSection) {

            const overviewSection =
                document.getElementById(
                    "overviewSection"
                );


            if (overviewSection) {

                overviewSection.classList.add(
                    "active-section"
                );
            }
        }

    }
);
