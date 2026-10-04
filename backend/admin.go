package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ============================================================
// ADMIN SESSION
// ============================================================

type AdminSession struct {
	AdminID   int64
	ExpiresAt time.Time
}

var (
	adminSessions  = make(map[string]AdminSession)
	adminSessionMu sync.RWMutex
)

const adminSessionTTL = 24 * time.Hour

// ============================================================
// TEACHER SESSION
// ============================================================

type TeacherSession struct {
	TeacherID int64
	ExpiresAt time.Time
}

var (
	teacherSessions  = make(map[string]TeacherSession)
	teacherSessionMu sync.RWMutex
)

const teacherSessionTTL = 24 * time.Hour

// ============================================================
// REQUEST TYPES
// ============================================================

type AdminRegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type AdminLoginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type AddTeacherRequest struct {
	Name    string `json:"name"`
	Subject string `json:"subject"`
}

type TeacherLoginRequest struct {
	TeacherID string `json:"teacher_id"`
	Password  string `json:"password"`
}

type TeacherChangePasswordRequest struct {
	NewPassword string `json:"new_password"`
}

// ============================================================
// ADMIN SESSION FUNCTIONS
// ============================================================

func createAdminSession(adminID int64) string {
	sessionID := uuid.NewString()

	adminSessionMu.Lock()

	adminSessions[sessionID] = AdminSession{
		AdminID:   adminID,
		ExpiresAt: time.Now().Add(adminSessionTTL),
	}

	adminSessionMu.Unlock()

	return sessionID
}

func getAdminSession(sessionID string) (AdminSession, bool) {
	adminSessionMu.RLock()

	session, exists := adminSessions[sessionID]

	adminSessionMu.RUnlock()

	if !exists {
		return AdminSession{}, false
	}

	if time.Now().After(session.ExpiresAt) {
		adminSessionMu.Lock()

		delete(adminSessions, sessionID)

		adminSessionMu.Unlock()

		return AdminSession{}, false
	}

	return session, true
}

func deleteAdminSession(sessionID string) {
	adminSessionMu.Lock()

	delete(adminSessions, sessionID)

	adminSessionMu.Unlock()
}

// ============================================================
// TEACHER SESSION FUNCTIONS
// ============================================================

func createTeacherSession(teacherID int64) string {
	sessionID := uuid.NewString()

	teacherSessionMu.Lock()

	teacherSessions[sessionID] = TeacherSession{
		TeacherID: teacherID,
		ExpiresAt: time.Now().Add(teacherSessionTTL),
	}

	teacherSessionMu.Unlock()

	return sessionID
}

func getTeacherSession(sessionID string) (TeacherSession, bool) {
	teacherSessionMu.RLock()

	session, exists := teacherSessions[sessionID]

	teacherSessionMu.RUnlock()

	if !exists {
		return TeacherSession{}, false
	}

	if time.Now().After(session.ExpiresAt) {
		teacherSessionMu.Lock()

		delete(teacherSessions, sessionID)

		teacherSessionMu.Unlock()

		return TeacherSession{}, false
	}

	return session, true
}

func deleteTeacherSession(sessionID string) {
	teacherSessionMu.Lock()

	delete(teacherSessions, sessionID)

	teacherSessionMu.Unlock()
}

// ============================================================
// ADMIN AUTH CHECK
// ============================================================

func requireAdmin(
	w http.ResponseWriter,
	r *http.Request,
) bool {
	cookie, err := r.Cookie("hih_admin_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return false
	}

	_, ok := getAdminSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return false
	}

	return true
}

// ============================================================
// TEACHER AUTH CHECK
// ============================================================

func requireTeacher(
	w http.ResponseWriter,
	r *http.Request,
) (TeacherSession, bool) {
	cookie, err := r.Cookie("hih_teacher_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return TeacherSession{}, false
	}

	session, ok := getTeacherSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return TeacherSession{}, false
	}

	return session, true
}

// ============================================================
// RANDOM TEMPORARY PASSWORD
// ============================================================

func generateTemporaryPassword() (string, error) {
	const alphabet =
		"ABCDEFGHJKLMNPQRSTUVWXYZ" +
			"abcdefghijkmnopqrstuvwxyz" +
			"23456789" +
			"@#$%"

	const length = 10

	result := make([]byte, length)
	randomBytes := make([]byte, length)

	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	for i := range result {
		result[i] =
			alphabet[int(randomBytes[i])%len(alphabet)]
	}

	return string(result), nil
}

// ============================================================
// ADMIN REGISTER
// ============================================================

func adminRegisterHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	var req AdminRegisterRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&req); err != nil {
		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.Name = strings.TrimSpace(req.Name)

	req.Email = strings.ToLower(
		strings.TrimSpace(req.Email),
	)

	req.Phone = strings.TrimSpace(req.Phone)

	if req.Name == "" ||
		req.Email == "" ||
		req.Phone == "" ||
		req.Password == "" {

		http.Error(
			w,
			"All fields are required",
			http.StatusBadRequest,
		)

		return
	}

	if len(req.Password) < 8 {
		http.Error(
			w,
			"Password must be at least 8 characters",
			http.StatusBadRequest,
		)

		return
	}

	passwordHash, err :=
		hashPassword(req.Password)

	if err != nil {
		http.Error(
			w,
			"Password processing failed",
			http.StatusInternalServerError,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	var adminID int64

	err = adminDB.QueryRow(
		ctx,
		`
		INSERT INTO admin.admins
		(
			name,
			email,
			phone,
			password_hash,
			status
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4,
			'active'
		)
		RETURNING id
		`,
		req.Name,
		req.Email,
		req.Phone,
		passwordHash,
	).Scan(&adminID)

	if err != nil {
		log.Println(
			"Admin registration database error:",
			err,
		)

		http.Error(
			w,
			"Admin registration failed",
			http.StatusConflict,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":  "Admin registration successful",
			"admin_id": adminID,
		},
	)
}

// ============================================================
// ADMIN LOGIN
// ============================================================

func adminLoginHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	var req AdminLoginRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&req); err != nil {
		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.Login = strings.TrimSpace(req.Login)

	if req.Login == "" ||
		req.Password == "" {

		http.Error(
			w,
			"Invalid admin credentials",
			http.StatusUnauthorized,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	var adminID int64
	var passwordHash string
	var status string

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT
			id,
			password_hash,
			status
		FROM admin.admins
		WHERE LOWER(email) = $1
		   OR phone = $1
		LIMIT 1
		`,
		strings.ToLower(req.Login),
	).Scan(
		&adminID,
		&passwordHash,
		&status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(
				w,
				"Invalid admin credentials",
				http.StatusUnauthorized,
			)

			return
		}

		log.Println(
			"Admin login database error:",
			err,
		)

		http.Error(
			w,
			"Admin login failed",
			http.StatusInternalServerError,
		)

		return
	}

	if status != "active" {
		http.Error(
			w,
			"Admin account is inactive",
			http.StatusForbidden,
		)

		return
	}

	if !verifyPassword(
		req.Password,
		passwordHash,
	) {
		http.Error(
			w,
			"Invalid admin credentials",
			http.StatusUnauthorized,
		)

		return
	}

	sessionID :=
		createAdminSession(adminID)

	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_admin_session",
			Value:    sessionID,
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int(adminSessionTTL.Seconds()),
		},
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":  "Admin login successful",
			"admin_id": adminID,
		},
	)
}

// ============================================================
// ADMIN LOGOUT
// ============================================================

func adminLogoutHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	cookie, err :=
		r.Cookie("hih_admin_session")

	if err == nil &&
		cookie.Value != "" {

		deleteAdminSession(
			cookie.Value,
		)
	}

	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_admin_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		},
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Admin logout successful",
		},
	)
}

// ============================================================
// ADMIN SESSION
// ============================================================

func adminSessionHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	cookie, err :=
		r.Cookie("hih_admin_session")

	if err != nil ||
		cookie.Value == "" {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getAdminSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"authenticated": true,
			"admin_id":      session.AdminID,
		},
	)
}

// ============================================================
// ADD TEACHER
// ============================================================

func addTeacherHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	var req AddTeacherRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&req); err != nil {

		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Subject = strings.TrimSpace(req.Subject)

	if req.Name == "" ||
		req.Subject == "" {

		http.Error(
			w,
			"Teacher name and subject are required",
			http.StatusBadRequest,
		)

		return
	}

	temporaryPassword, err :=
		generateTemporaryPassword()

	if err != nil {
		log.Println(
			"Temporary password generation error:",
			err,
		)

		http.Error(
			w,
			"Password generation failed",
			http.StatusInternalServerError,
		)

		return
	}

	passwordHash, err :=
		hashPassword(temporaryPassword)

	if err != nil {
		log.Println(
			"Teacher password hashing error:",
			err,
		)

		http.Error(
			w,
			"Password processing failed",
			http.StatusInternalServerError,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	tempTeacherID :=
		"TEMP-" + uuid.NewString()

	var teacherDBID int64

	err = adminDB.QueryRow(
		ctx,
		`
		INSERT INTO admin.teachers
		(
			teacher_id,
			name,
			email,
			phone,
			subject,
			password_hash,
			status,
			must_change_password
		)
		VALUES
		(
			$1,
			$2,
			NULL,
			NULL,
			$3,
			$4,
			'active',
			TRUE
		)
		RETURNING id
		`,
		tempTeacherID,
		req.Name,
		req.Subject,
		passwordHash,
	).Scan(&teacherDBID)

	if err != nil {
		log.Println(
			"Teacher insert error:",
			err,
		)

		http.Error(
			w,
			"Teacher creation failed",
			http.StatusInternalServerError,
		)

		return
	}

	teacherUserID := fmt.Sprintf(
		"TCH%04d",
		teacherDBID,
	)

	_, err = adminDB.Exec(
		ctx,
		`
		UPDATE admin.teachers
		SET
			teacher_id = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		`,
		teacherUserID,
		teacherDBID,
	)

	if err != nil {
		log.Println(
			"Teacher ID update error:",
			err,
		)

		http.Error(
			w,
			"Teacher ID generation failed",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":              "Teacher added successfully",
			"teacher_id":           teacherUserID,
			"temporary_password":   temporaryPassword,
			"name":                 req.Name,
			"subject":              req.Subject,
			"status":               "active",
			"must_change_password": true,
		},
	)
}

// ============================================================
// DELETE TEACHER
// ============================================================

func deleteTeacherHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodDelete {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	teacherID :=
		strings.TrimSpace(
			r.URL.Query().Get("teacher_id"),
		)

	if teacherID == "" {
		http.Error(
			w,
			"Teacher ID is required",
			http.StatusBadRequest,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	result, err := adminDB.Exec(
		ctx,
		`
		DELETE FROM admin.teachers
		WHERE teacher_id = $1
		`,
		teacherID,
	)

	if err != nil {
		log.Println(
			"Teacher delete error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove teacher",
			http.StatusInternalServerError,
		)

		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Teacher not found",
			http.StatusNotFound,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]string{
			"message":    "Teacher removed successfully",
			"teacher_id": teacherID,
		},
	)
}

// ============================================================
// GET ALL TEACHERS
// ============================================================

func getTeachersHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			teacher_id,
			name,
			email,
			phone,
			subject,
			status,
			created_at,
			updated_at
		FROM admin.teachers
		ORDER BY id DESC
		`,
	)

	if err != nil {
		log.Println(
			"Teachers query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load teachers",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	type Teacher struct {
		TeacherID string    `json:"teacher_id"`
		Name      string    `json:"name"`
		Email     *string   `json:"email"`
		Phone     *string   `json:"phone"`
		Subject   string    `json:"subject"`
		Status    string    `json:"status"`
		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	teachers := make([]Teacher, 0)

	for rows.Next() {
		var teacher Teacher

		err := rows.Scan(
			&teacher.TeacherID,
			&teacher.Name,
			&teacher.Email,
			&teacher.Phone,
			&teacher.Subject,
			&teacher.Status,
			&teacher.CreatedAt,
			&teacher.UpdatedAt,
		)

		if err != nil {
			log.Println(
				"Teacher row scan error:",
				err,
			)

			continue
		}

		teachers = append(
			teachers,
			teacher,
		)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"teachers": teachers,
		},
	)
}

// ============================================================
// GET ALL STUDENTS
// ============================================================

func getStudentsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method == http.MethodDelete {
		deleteStudentHandler(w, r)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			id,
			name,
			email,
			phone,
			status,
			created_at,
			updated_at
		FROM public.users
		ORDER BY id DESC
		`,
	)

	if err != nil {
		log.Println(
			"Students query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load students",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	type Student struct {
		UserID    int64     `json:"user_id"`
		Name      string    `json:"name"`
		Email     string    `json:"email"`
		Phone     string    `json:"phone"`
		Status    string    `json:"status"`
		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	students := make([]Student, 0)

	for rows.Next() {
		var student Student

		err := rows.Scan(
			&student.UserID,
			&student.Name,
			&student.Email,
			&student.Phone,
			&student.Status,
			&student.CreatedAt,
			&student.UpdatedAt,
		)

		if err != nil {
			log.Println(
				"Student row scan error:",
				err,
			)

			continue
		}

		students = append(
			students,
			student,
		)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"students": students,
		},
	)
}

// ============================================================
// DELETE STUDENT
// ============================================================

func deleteStudentHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodDelete {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	userIDText :=
		strings.TrimSpace(
			r.URL.Query().Get("user_id"),
		)

	if userIDText == "" {
		http.Error(
			w,
			"User ID is required",
			http.StatusBadRequest,
		)

		return
	}

	var userID int64

	if _, err := fmt.Sscan(
		userIDText,
		&userID,
	); err != nil || userID <= 0 {

		http.Error(
			w,
			"Invalid User ID",
			http.StatusBadRequest,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	tx, err := adminDB.Begin(ctx)

	if err != nil {
		log.Println(
			"Student delete transaction error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove student",
			http.StatusInternalServerError,
		)

		return
	}

	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`
		DELETE FROM public.course_applications
		WHERE user_id = $1
		`,
		userID,
	)

	if err != nil {
		log.Println(
			"Student application cleanup error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove student",
			http.StatusInternalServerError,
		)

		return
	}

	result, err := tx.Exec(
		ctx,
		`
		DELETE FROM public.users
		WHERE id = $1
		`,
		userID,
	)

	if err != nil {
		log.Println(
			"Student delete error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove student",
			http.StatusInternalServerError,
		)

		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Student not found",
			http.StatusNotFound,
		)

		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Println(
			"Student delete commit error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove student",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message": "Student removed successfully",
			"user_id": userID,
		},
	)
}

// ============================================================
// DELETE COURSE APPLICATION
// ============================================================

func deleteApplicationHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodDelete {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	userIDText :=
		strings.TrimSpace(
			r.URL.Query().Get("user_id"),
		)

	courseType :=
		strings.TrimSpace(
			r.URL.Query().Get("course_type"),
		)

	courseName :=
		strings.TrimSpace(
			r.URL.Query().Get("course_name"),
		)

	if userIDText == "" ||
		courseType == "" ||
		courseName == "" {

		http.Error(
			w,
			"Application details are required",
			http.StatusBadRequest,
		)

		return
	}

	var userID int64

	if _, err := fmt.Sscan(
		userIDText,
		&userID,
	); err != nil || userID <= 0 {

		http.Error(
			w,
			"Invalid User ID",
			http.StatusBadRequest,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	result, err := adminDB.Exec(
		ctx,
		`
		DELETE FROM public.course_applications
		WHERE user_id = $1
		  AND course_type = $2
		  AND course_name = $3
		`,
		userID,
		courseType,
		courseName,
	)

	if err != nil {
		log.Println(
			"Course application delete error:",
			err,
		)

		http.Error(
			w,
			"Unable to remove application",
			http.StatusInternalServerError,
		)

		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Course application not found",
			http.StatusNotFound,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message": "Course application removed successfully",
			"user_id": userID,
		},
	)
}

// ============================================================
// GET COURSE APPLICATIONS
// ============================================================

func getApplicationsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method == http.MethodDelete {
		deleteApplicationHandler(w, r)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			ca.user_id,
			u.name,
			u.email,
			u.phone,
			ca.course_type,
			ca.course_name
		FROM public.course_applications ca
		INNER JOIN public.users u
			ON u.id = ca.user_id
		ORDER BY ca.user_id DESC
		`,
	)

	if err != nil {
		log.Println(
			"Applications query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load applications",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	type Application struct {
		UserID      int64  `json:"user_id"`
		StudentName string `json:"student_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		CourseType  string `json:"course_type"`
		CourseName  string `json:"course_name"`
		Status      string `json:"status"`
	}

	applications := make([]Application, 0)

	for rows.Next() {
		var application Application

		err := rows.Scan(
			&application.UserID,
			&application.StudentName,
			&application.Email,
			&application.Phone,
			&application.CourseType,
			&application.CourseName,
		)

		if err != nil {
			log.Println(
				"Application row scan error:",
				err,
			)

			continue
		}

		application.Status = "pending"

		applications = append(
			applications,
			application,
		)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"applications": applications,
		},
	)
}

// ============================================================
// ADMIN NOTIFICATION TABLE
// ============================================================

var notificationTableOnce sync.Once

func ensureAdminNotificationTable(
	ctx context.Context,
) error {
	var tableErr error

	notificationTableOnce.Do(
		func() {

			if adminDB == nil {
				tableErr = fmt.Errorf(
					"admin database connection is nil",
				)

				return
			}

			_, tableErr = adminDB.Exec(
				ctx,
				`
				CREATE TABLE IF NOT EXISTS admin.notifications
				(
					id BIGINT
						GENERATED BY DEFAULT AS IDENTITY
						PRIMARY KEY,

					user_id BIGINT,

					event_type VARCHAR(50)
						NOT NULL,

					title VARCHAR(200)
						NOT NULL,

					message TEXT
						NOT NULL,

					is_read BOOLEAN
						NOT NULL
						DEFAULT FALSE,

					created_at TIMESTAMPTZ
						NOT NULL
						DEFAULT CURRENT_TIMESTAMP
				)
				`,
			)

			if tableErr != nil {
				log.Println(
					"Notification table creation error:",
					tableErr,
				)
			}
		},
	)

	return tableErr
}

// ============================================================
// RECORD ADMIN NOTIFICATION
// ============================================================

func recordAdminNotification(
	ctx context.Context,
	userID *int64,
	eventType string,
	title string,
	message string,
) {
	if adminDB == nil {
		log.Println(
			"Admin notification skipped: adminDB is nil",
		)

		return
	}

	if err := ensureAdminNotificationTable(
		ctx,
	); err != nil {
		return
	}

	_, err := adminDB.Exec(
		ctx,
		`
		INSERT INTO admin.notifications
		(
			user_id,
			event_type,
			title,
			message
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4
		)
		`,
		userID,
		eventType,
		title,
		message,
	)

	if err != nil {
		log.Println(
			"Notification insert error:",
			err,
		)
	}
}

// ============================================================
// GET NOTIFICATIONS
// ============================================================

func getNotificationsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	if err := ensureAdminNotificationTable(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Unable to prepare notifications",
			http.StatusInternalServerError,
		)

		return
	}

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			id,
			user_id,
			event_type,
			title,
			message,
			is_read,
			created_at
		FROM admin.notifications
		ORDER BY id DESC
		LIMIT 100
		`,
	)

	if err != nil {
		log.Println(
			"Notifications query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load notifications",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	type Notification struct {
		ID        int64     `json:"id"`
		UserID    *int64    `json:"user_id"`
		EventType string    `json:"event_type"`
		Title     string    `json:"title"`
		Message   string    `json:"message"`
		IsRead    bool      `json:"is_read"`
		CreatedAt time.Time `json:"created_at"`
	}

	notifications := make([]Notification, 0)

	for rows.Next() {
		var notification Notification

		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.EventType,
			&notification.Title,
			&notification.Message,
			&notification.IsRead,
			&notification.CreatedAt,
		)

		if err != nil {
			log.Println(
				"Notification row scan error:",
				err,
			)

			continue
		}

		notifications = append(
			notifications,
			notification,
		)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"notifications": notifications,
		},
	)
}

// ============================================================
// ADMIN OVERVIEW
// ============================================================

func adminOverviewHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	if !requireAdmin(w, r) {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	var students int64
	var teachers int64
	var applications int64
	var notifications int64

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM public.users
		`,
	).Scan(&students)

	if err != nil {
		log.Println(
			"Overview students query error:",
			err,
		)

		http.Error(
			w,
			"Overview loading failed",
			http.StatusInternalServerError,
		)

		return
	}

	err = adminDB.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM admin.teachers
		`,
	).Scan(&teachers)

	if err != nil {
		log.Println(
			"Overview teachers query error:",
			err,
		)

		http.Error(
			w,
			"Overview loading failed",
			http.StatusInternalServerError,
		)

		return
	}

	err = adminDB.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM public.course_applications
		`,
	).Scan(&applications)

	if err != nil {
		log.Println(
			"Overview applications query error:",
			err,
		)

		http.Error(
			w,
			"Overview loading failed",
			http.StatusInternalServerError,
		)

		return
	}

	if err := ensureAdminNotificationTable(
		ctx,
	); err == nil {

		_ = adminDB.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM admin.notifications
			WHERE is_read = FALSE
			`,
		).Scan(&notifications)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]int64{
			"total_students":       students,
			"total_teachers":       teachers,
			"total_applications":   applications,
			"total_notifications": notifications,
		},
	)
}

// ============================================================
// TEACHER LOGIN
// ============================================================

func teacherLoginHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	var req TeacherLoginRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&req); err != nil {

		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.TeacherID =
		strings.TrimSpace(
			req.TeacherID,
		)

	if req.TeacherID == "" ||
		req.Password == "" {

		http.Error(
			w,
			"Invalid teacher credentials",
			http.StatusUnauthorized,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	var teacherID int64
	var teacherUserID string
	var teacherName string
	var subject string
	var passwordHash string
	var status string
	var mustChangePassword bool

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT
			id,
			teacher_id,
			name,
			subject,
			password_hash,
			status,
			must_change_password
		FROM admin.teachers
		WHERE teacher_id = $1
		LIMIT 1
		`,
		req.TeacherID,
	).Scan(
		&teacherID,
		&teacherUserID,
		&teacherName,
		&subject,
		&passwordHash,
		&status,
		&mustChangePassword,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(
				w,
				"Invalid teacher credentials",
				http.StatusUnauthorized,
			)

			return
		}

		log.Println(
			"Teacher login database error:",
			err,
		)

		http.Error(
			w,
			"Teacher login failed",
			http.StatusInternalServerError,
		)

		return
	}

	if status != "active" {
		http.Error(
			w,
			"Teacher account is inactive",
			http.StatusForbidden,
		)

		return
	}

	if !verifyPassword(
		req.Password,
		passwordHash,
	) {
		http.Error(
			w,
			"Invalid teacher credentials",
			http.StatusUnauthorized,
		)

		return
	}

	teacherSessionID :=
		createTeacherSession(
			teacherID,
		)

	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_teacher_session",
			Value:    teacherSessionID,
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge: int(
				teacherSessionTTL.Seconds(),
			),
		},
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":              "Teacher login successful",
			"teacher_id":           teacherUserID,
			"name":                 teacherName,
			"subject":              subject,
			"must_change_password": mustChangePassword,
		},
	)
}

// ============================================================
// TEACHER CHANGE PASSWORD
// ============================================================

func teacherChangePasswordHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	session, ok :=
		requireTeacher(w, r)

	if !ok {
		return
	}

	var req TeacherChangePasswordRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&req); err != nil {

		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.NewPassword =
		strings.TrimSpace(
			req.NewPassword,
		)

	if req.NewPassword == "" {
		http.Error(
			w,
			"New password is required",
			http.StatusBadRequest,
		)

		return
	}

	if len(req.NewPassword) < 8 {
		http.Error(
			w,
			"Password must be at least 8 characters",
			http.StatusBadRequest,
		)

		return
	}

	newPasswordHash, err :=
		hashPassword(
			req.NewPassword,
		)

	if err != nil {
		http.Error(
			w,
			"Password processing failed",
			http.StatusInternalServerError,
		)

		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	result, err := adminDB.Exec(
		ctx,
		`
		UPDATE admin.teachers
		SET
			password_hash = $1,
			must_change_password = FALSE,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		  AND status = 'active'
		`,
		newPasswordHash,
		session.TeacherID,
	)

	if err != nil {
		log.Println(
			"Teacher password update error:",
			err,
		)

		http.Error(
			w,
			"Password update failed",
			http.StatusInternalServerError,
		)

		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Teacher account not found",
			http.StatusNotFound,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":              "Permanent password set successfully",
			"must_change_password": false,
		},
	)
}

// ============================================================
// TEACHER PROFILE
// ============================================================

func teacherProfileHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	session, ok :=
		requireTeacher(w, r)

	if !ok {
		return
	}

	ctx, cancel :=
		context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

	defer cancel()

	var teacherUserID string
	var name string
	var subject string
	var status string
	var createdAt time.Time
	var updatedAt time.Time
	var mustChangePassword bool

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT
			teacher_id,
			name,
			subject,
			status,
			created_at,
			updated_at,
			must_change_password
		FROM admin.teachers
		WHERE id = $1
		LIMIT 1
		`,
		session.TeacherID,
	).Scan(
		&teacherUserID,
		&name,
		&subject,
		&status,
		&createdAt,
		&updatedAt,
		&mustChangePassword,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(
				w,
				"Teacher not found",
				http.StatusNotFound,
			)

			return
		}

		log.Println(
			"Teacher profile error:",
			err,
		)

		http.Error(
			w,
			"Unable to load teacher profile",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"teacher_id":           teacherUserID,
			"name":                 name,
			"subject":              subject,
			"status":               status,
			"created_at":           createdAt,
			"updated_at":           updatedAt,
			"must_change_password": mustChangePassword,
		},
	)
}

// ============================================================
// TEACHER SESSION
// ============================================================

func teacherSessionHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	cookie, err :=
		r.Cookie("hih_teacher_session")

	if err != nil ||
		cookie.Value == "" {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getTeacherSession(
			cookie.Value,
		)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"authenticated": true,
			"teacher_db_id": session.TeacherID,
		},
	)
}

// ============================================================
// TEACHER LOGOUT
// ============================================================

func teacherLogoutHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	cookie, err :=
		r.Cookie("hih_teacher_session")

	if err == nil &&
		cookie.Value != "" {

		deleteTeacherSession(
			cookie.Value,
		)
	}

	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_teacher_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		},
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Teacher logout successful",
		},
	)
}