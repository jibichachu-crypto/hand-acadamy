"use strict";

document.addEventListener("DOMContentLoaded", async function () {

    /* ============================================================
       ADMIN SESSION
    ============================================================ */

    try {
        const response = await fetch(
            "/admin/session",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            window.location.replace("/admin-login.html");
            return;
        }

        const data = await response.json().catch(function () {
            return {};
        });

        if (data.authenticated === false) {
            window.location.replace("/admin-login.html");
            return;
        }

    } catch (error) {
        window.location.replace("/admin-login.html");
        return;
    }


    /* ============================================================
       ELEMENTS
    ============================================================ */

    const navItems =
        document.querySelectorAll(".nav-item");

    const sections =
        document.querySelectorAll(".admin-section");

    const teacherList =
        document.getElementById("teacherList");

    const studentList =
        document.getElementById("studentList");

    const applicationsList =
        document.getElementById("applicationsList");

    const notificationsList =
        document.getElementById("notificationsList");

    const addTeacherForm =
        document.getElementById("addTeacherForm");

    const teacherMessage =
        document.getElementById("teacherMessage");

    const detailsModal =
        document.getElementById("detailsModal");

    const detailsModalContent =
        document.getElementById("detailsModalContent");

    const closeDetailsModal =
        document.getElementById("closeDetailsModal");

    const adminLogoutButton =
        document.getElementById("adminLogoutButton");

    const sendChatButton =
        document.getElementById("sendChatButton");

    const chatMessageInput =
        document.getElementById("chatMessageInput");


    /* ============================================================
       HELPERS
    ============================================================ */

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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
        element.textContent = text;

        element.className =
            "form-message " +
            (isError ? "error" : "success");
    }


    function clearMessage(element) {
        if (!element) {
            return;
        }

        element.hidden = true;
        element.textContent = "";
        element.className = "form-message";
    }


    async function getJSON(
        url,
        options = {}
    ) {
        const response = await fetch(
            url,
            {
                credentials: "include",
                cache: "no-store",
                ...options
            }
        );


        const responseText =
            await response.text();


        let data = {};


        try {
            data = responseText
                ? JSON.parse(responseText)
                : {};
        } catch (error) {
            data = {};
        }


        if (response.status === 401) {
            window.location.replace("/admin-login.html");
            throw new Error(
                "Admin session expired."
            );
        }


        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                responseText.trim() ||
                "Request failed."
            );
        }


        return data;
    }


    function formatLabel(key) {
        return String(key)
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                function (letter) {
                    return letter.toUpperCase();
                }
            );
    }


    /* ============================================================
       NAVIGATION
    ============================================================ */

    function activateSection(
        sectionId,
        clickedNav
    ) {

        if (!sectionId) {
            return;
        }


        sections.forEach(
            function (section) {
                section.classList.toggle(
                    "active-section",
                    section.id === sectionId
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


        if (sectionId === "addTeacherSection") {
            clearMessage(teacherMessage);
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


    clearMessage(teacherMessage);


    /* ============================================================
       OVERVIEW
    ============================================================ */

    async function loadOverview() {

        try {

            const data =
                await getJSON(
                    "/admin/overview"
                );


            const values = {

                totalStudents:
                    data.total_students ?? 0,

                totalTeachers:
                    data.total_teachers ?? 0,

                totalApplications:
                    data.total_applications ?? 0,

                totalNotifications:
                    data.total_notifications ?? 0,

                teacherCount:
                    data.total_teachers ?? 0,

                studentCount:
                    data.total_students ?? 0,

                applicationCount:
                    data.total_applications ?? 0,

                notificationCount:
                    data.total_notifications ?? 0
            };


            Object.entries(values).forEach(
                function ([id, value]) {

                    const element =
                        document.getElementById(id);


                    if (element) {
                        element.textContent = value;
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


    /* ============================================================
       ADD TEACHER
    ============================================================ */

    if (addTeacherForm) {

        addTeacherForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                clearMessage(teacherMessage);


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


                if (!name || !subject) {

                    showMessage(
                        teacherMessage,
                        "Teacher name and subject are required.",
                        true
                    );

                    return;
                }


                const button =
                    addTeacherForm.querySelector(
                        'button[type="submit"]'
                    );


                if (button) {
                    button.disabled = true;
                    button.textContent = "Adding...";
                }


                try {

                    const result =
                        await getJSON(
                            "/admin/teachers",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    name: name,
                                    subject: subject
                                })
                            }
                        );


                    addTeacherForm.reset();


                    let successText =
                        result.message ||
                        "Teacher added successfully.";


                    if (result.teacher_id) {
                        successText +=
                            " User ID: " +
                            String(result.teacher_id);
                    }


                    if (result.temporary_password) {
                        successText +=
                            " | Temporary Password: " +
                            String(
                                result.temporary_password
                            );
                    }


                    showMessage(
                        teacherMessage,
                        successText,
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

                    if (button) {
                        button.disabled = false;
                        button.textContent =
                            "Add Teacher";
                    }
                }
            }
        );
    }


    /* ============================================================
       LOAD TEACHERS
    ============================================================ */

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
                Array.isArray(data.teachers)
                    ? data.teachers
                    : [];


            teacherList.innerHTML = "";


            if (teachers.length === 0) {

                teacherList.innerHTML =
                    '<div class="empty-state">' +
                    "No teachers added yet." +
                    "</div>";

                return;
            }


            teachers.forEach(
                function (teacher) {

                    const card =
                        document.createElement("div");


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
                                    teacher.created_at
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


                    teacherList.appendChild(card);
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


    /* ============================================================
       LOAD STUDENTS
    ============================================================ */

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
                Array.isArray(data.students)
                    ? data.students
                    : [];


            studentList.innerHTML = "";


            if (students.length === 0) {

                studentList.innerHTML =
                    '<div class="empty-state">' +
                    "No students registered yet." +
                    "</div>";

                return;
            }


            students.forEach(
                function (student) {

                    const card =
                        document.createElement("div");


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


                    studentList.appendChild(card);
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


    /* ============================================================
       LOAD APPLICATIONS
    ============================================================ */

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


            applicationsList.innerHTML = "";


            if (applications.length === 0) {

                applicationsList.innerHTML =
                    '<div class="empty-state">' +
                    "No course applications yet." +
                    "</div>";

                return;
            }


            applications.forEach(
                function (application) {

                    const card =
                        document.createElement("div");


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


                    applicationsList.appendChild(card);
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


    /* ============================================================
       LOAD NOTIFICATIONS
    ============================================================ */

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


            notificationsList.innerHTML = "";


            if (notifications.length === 0) {

                notificationsList.innerHTML =
                    '<div class="empty-state">' +
                    "No new notifications." +
                    "</div>";

                return;
            }


            notifications.forEach(
                function (notification) {

                    const card =
                        document.createElement("div");


                    card.className =
                        "data-card";


                    card.innerHTML = `
                        <div class="data-card-title">
                            ${escapeHTML(
                                notification.title ||
                                notification.type ||
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
                                ${escapeHTML(
                                    notification.created_at
                                )}
                            </span>

                        </div>
                    `;


                    card.addEventListener(
                        "click",
                        function () {

                            openDetails(
                                "Notification Details",
                                notification,
                                "notification"
                            );
                        }
                    );


                    notificationsList.appendChild(card);
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


    /* ============================================================
       DETAILS MODAL
    ============================================================ */

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


        const hiddenKeys = new Set([
            "password",
            "password_hash",
            "temporary_password"
        ]);


        const removalConfig = {

            teacher: {

                label: "Remove Teacher",

                confirmLabel: "Confirm Remove",

                url: function (item) {
                    return (
                        "/admin/teachers?teacher_id=" +
                        encodeURIComponent(
                            String(
                                item.teacher_id || ""
                            ).trim()
                        )
                    );
                },

                refresh: async function () {

                    await Promise.all([
                        loadTeachers(),
                        loadOverview()
                    ]);
                }
            },


            student: {

                label: "Remove Student",

                confirmLabel: "Confirm Remove",

                url: function (item) {
                    return (
                        "/admin/students?user_id=" +
                        encodeURIComponent(
                            String(
                                item.user_id || ""
                            ).trim()
                        )
                    );
                },

                refresh: async function () {

                    await Promise.all([
                        loadStudents(),
                        loadApplications(),
                        loadOverview()
                    ]);
                }
            },


            application: {

                label: "Remove Application",

                confirmLabel: "Confirm Remove",

                url: function (item) {

                    return (
                        "/admin/applications?user_id=" +
                        encodeURIComponent(
                            String(
                                item.user_id || ""
                            ).trim()
                        ) +
                        "&course_type=" +
                        encodeURIComponent(
                            String(
                                item.course_type || ""
                            ).trim()
                        ) +
                        "&course_name=" +
                        encodeURIComponent(
                            String(
                                item.course_name || ""
                            ).trim()
                        )
                    );
                },

                refresh: async function () {

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
            function ([key, value]) {

                if (hiddenKeys.has(key)) {
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
                                formatLabel(key)
                            )}
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(value)}
                        </div>

                    </div>
                `;
            }
        );


        const config =
            removalConfig[detailType];


        const canRemove =
            !!config &&
            !!data &&
            (
                (
                    detailType === "teacher" &&
                    data.teacher_id
                ) ||
                (
                    detailType === "student" &&
                    data.user_id
                ) ||
                (
                    detailType === "application" &&
                    data.user_id
                )
            );


        if (canRemove) {

            html += `
                <div
                    class="remove-area"
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
                            min-height:44px;
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


        detailsModal.hidden = false;


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
                    removeButton.dataset.confirmed !==
                    "true"
                ) {

                    removeButton.dataset.confirmed =
                        "true";

                    removeButton.textContent =
                        config.confirmLabel;

                    removeButton.style.background =
                        "#991b1b";


                    if (removeConfirmHint) {
                        removeConfirmHint.hidden =
                            false;
                    }


                    return;
                }


                removeButton.disabled = true;

                removeButton.textContent =
                    "Removing...";


                try {

                    const result =
                        await getJSON(
                            config.url(data),
                            {
                                method: "DELETE"
                            }
                        );


                    detailsModal.hidden = true;


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

                    removeButton.style.background =
                        "#991b1b";
                }
            }
        );
    }


    /* ============================================================
       CLOSE MODAL
    ============================================================ */

    if (closeDetailsModal) {

        closeDetailsModal.addEventListener(
            "click",
            function () {

                if (detailsModal) {
                    detailsModal.hidden = true;
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
                    detailsModal.hidden = true;
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                if (detailsModal) {
                    detailsModal.hidden = true;
                }
            }
        }
    );


    /* ============================================================
       LOGOUT
    ============================================================ */

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
                            method: "POST",
                            credentials: "include",
                            cache: "no-store"
                        }
                    );

                } catch (error) {
                    // Redirect even if logout request fails.
                }


                window.location.replace(
                    "/admin-login.html"
                );
            }
        );
    }


    /* ============================================================
       CHAT UI
    ============================================================ */

    if (
        sendChatButton &&
        chatMessageInput
    ) {

        sendChatButton.addEventListener(
            "click",
            function () {

                const message =
                    chatMessageInput.value.trim();


                if (!message) {
                    return;
                }


                /*
                    Chat backend is not connected yet.
                    Keep the UI ready without pretending
                    the message was sent.
                */

                console.log(
                    "Chat message not sent:",
                    message
                );

                chatMessageInput.value = "";
            }
        );


        chatMessageInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendChatButton.click();
                }
            }
        );
    }


    /* ============================================================
       INITIAL LOAD
    ============================================================ */

    await loadOverview();
    await loadTeachers();
    await loadStudents();
    await loadApplications();
    await loadNotifications();

});
