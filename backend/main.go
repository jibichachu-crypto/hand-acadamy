package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/argon2"
)

var db *pgxpool.Pool

type Session struct {
	UserID    int64
	ExpiresAt time.Time
}

var (
	sessions   = make(map[string]Session)
	sessionMu  sync.RWMutex
	sessionTTL = 24 * time.Hour
)

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type CourseApplicationRequest struct {
	CourseType string `json:"course_type"`
	CourseName string `json:"course_name"`
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)

	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey(
		[]byte(password),
		salt,
		3,
		64*1024,
		4,
		32,
	)

	return base64.RawStdEncoding.EncodeToString(salt) +
		"$" +
		base64.RawStdEncoding.EncodeToString(hash), nil
}

func verifyPassword(password, storedHash string) bool {
	parts := strings.Split(storedHash, "$")

	if len(parts) != 2 {
		return false
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}

	actualHash := argon2.IDKey(
		[]byte(password),
		salt,
		3,
		64*1024,
		4,
		32,
	)

	if len(actualHash) != len(expectedHash) {
		return false
	}

	var result byte

	for i := range actualHash {
		result |= actualHash[i] ^ expectedHash[i]
	}

	return result == 0
}

func createSession(userID int64) string {
	sessionID := uuid.NewString()

	sessionMu.Lock()

	sessions[sessionID] = Session{
		UserID:    userID,
		ExpiresAt: time.Now().Add(sessionTTL),
	}

	sessionMu.Unlock()

	return sessionID
}

func getSession(sessionID string) (Session, bool) {
	sessionMu.RLock()

	session, exists := sessions[sessionID]

	sessionMu.RUnlock()

	if !exists {
		return Session{}, false
	}

	if time.Now().After(session.ExpiresAt) {
		sessionMu.Lock()

		delete(sessions, sessionID)

		sessionMu.Unlock()

		return Session{}, false
	}

	return session, true
}

func deleteSession(sessionID string) {
	sessionMu.Lock()

	delete(sessions, sessionID)

	sessionMu.Unlock()
}

func isHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}

	proto := strings.ToLower(
		strings.TrimSpace(
			r.Header.Get("X-Forwarded-Proto"),
		),
	)

	return proto == "https"
}

func setSessionCookie(
	w http.ResponseWriter,
	r *http.Request,
	sessionID string,
) {
	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_session",
			Value:    sessionID,
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int(sessionTTL.Seconds()),
		},
	)
}

func clearSessionCookie(
	w http.ResponseWriter,
	r *http.Request,
) {
	http.SetCookie(
		w,
		&http.Cookie{
			Name:     "hih_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		},
	)
}

func requireAdminPage(
	w http.ResponseWriter,
	r *http.Request,
) bool {
	cookie, err := r.Cookie("hih_admin_session")

	if err != nil || cookie.Value == "" {
		http.Redirect(
			w,
			r,
			"/admin-login.html",
			http.StatusFound,
		)

		return false
	}

	_, ok := getAdminSession(cookie.Value)

	if !ok {
		http.Redirect(
			w,
			r,
			"/admin-login.html",
			http.StatusFound,
		)

		return false
	}

	return true
}

func corsMiddleware(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			origin := r.Header.Get("Origin")

			if origin == "http://127.0.0.1:5500" ||
				origin == "http://localhost:5500" {

				w.Header().Set(
					"Access-Control-Allow-Origin",
					origin,
				)

				w.Header().Set(
					"Access-Control-Allow-Credentials",
					"true",
				)
			}

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type",
			)

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, DELETE, OPTIONS",
			)

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		},
	)
}

func registerHandler(
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

	var req RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
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

	passwordHash, err := hashPassword(req.Password)

	if err != nil {
		http.Error(
			w,
			"Password processing failed",
			http.StatusInternalServerError,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var userID int64

	err = db.QueryRow(
		ctx,
		`
		INSERT INTO users
		(
			id,
			name,
			email,
			phone,
			password_hash,
			status,
			created_at,
			updated_at
		)
		VALUES
		(
			DEFAULT,
			$1,
			$2,
			$3,
			$4,
			'active',
			CURRENT_TIMESTAMP,
			CURRENT_TIMESTAMP
		)
		RETURNING id
		`,
		req.Name,
		req.Email,
		req.Phone,
		passwordHash,
	).Scan(&userID)

	if err != nil {
		log.Println(
			"Registration database error:",
			err,
		)

		http.Error(
			w,
			"Registration failed. Email or phone may already exist.",
			http.StatusConflict,
		)

		return
	}

	recordAdminNotification(
		ctx,
		&userID,
		"student_registration",
		"New Student Registration",
		"Student "+req.Name+
			" (User ID: "+
			formatUserID(userID)+
			") has registered.",
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message": "Registration successful",
			"user_id": userID,
		},
	)
}

func loginHandler(
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

	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.Login = strings.TrimSpace(req.Login)

	if req.Login == "" || req.Password == "" {
		http.Error(
			w,
			"Invalid login credentials",
			http.StatusUnauthorized,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var userID int64
	var passwordHash string
	var status string
	var userName string
	var userEmail string
	var userPhone string

	err := db.QueryRow(
		ctx,
		`
		SELECT
			id,
			name,
			email,
			phone,
			password_hash,
			status
		FROM users
		WHERE LOWER(email) = $1
		   OR phone = $1
		LIMIT 1
		`,
		strings.ToLower(req.Login),
	).Scan(
		&userID,
		&userName,
		&userEmail,
		&userPhone,
		&passwordHash,
		&status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(
				w,
				"Invalid login credentials",
				http.StatusUnauthorized,
			)

			return
		}

		log.Println(
			"Login database error:",
			err,
		)

		http.Error(
			w,
			"Login failed",
			http.StatusInternalServerError,
		)

		return
	}

	if status != "active" {
		http.Error(
			w,
			"User account is inactive",
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
			"Invalid login credentials",
			http.StatusUnauthorized,
		)

		return
	}

	sessionID := createSession(userID)

	setSessionCookie(
		w,
		r,
		sessionID,
	)

	recordAdminNotification(
		ctx,
		&userID,
		"student_login",
		"Student Login",
		"Student "+userName+
			" (User ID: "+
			formatUserID(userID)+
			") logged in.",
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message": "Login successful",
			"user_id": userID,
			"user": map[string]interface{}{
				"id":    userID,
				"name":  userName,
				"email": userEmail,
				"phone": userPhone,
			},
		},
	)
}

func logoutHandler(
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

	cookie, err := r.Cookie("hih_session")

	if err == nil && cookie.Value != "" {
		deleteSession(cookie.Value)
	}

	clearSessionCookie(
		w,
		r,
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Logout successful",
		},
	)
}

func sessionHandler(
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

	cookie, err := r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok := getSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var userName string
	var userEmail string
	var userPhone string
	var status string

	err = db.QueryRow(
		ctx,
		`
		SELECT
			name,
			email,
			phone,
			status
		FROM users
		WHERE id = $1
		LIMIT 1
		`,
		session.UserID,
	).Scan(
		&userName,
		&userEmail,
		&userPhone,
		&status,
	)

	if err != nil {
		log.Println(
			"Session user lookup error:",
			err,
		)

		http.Error(
			w,
			"Unable to load user session",
			http.StatusInternalServerError,
		)

		return
	}

	if status != "active" {
		deleteSession(cookie.Value)

		clearSessionCookie(
			w,
			r,
		)

		http.Error(
			w,
			"User account is inactive",
			http.StatusForbidden,
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
			"user_id":       session.UserID,
			"user": map[string]interface{}{
				"id":    session.UserID,
				"name":  userName,
				"email": userEmail,
				"phone": userPhone,
			},
		},
	)
}

func applyCourseHandler(
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

	cookie, err := r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok := getSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		8<<10,
	)

	var req CourseApplicationRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"Invalid request",
			http.StatusBadRequest,
		)

		return
	}

	req.CourseType = strings.TrimSpace(req.CourseType)
	req.CourseName = strings.TrimSpace(req.CourseName)

	if req.CourseType == "" ||
		req.CourseName == "" {

		http.Error(
			w,
			"Course details are required",
			http.StatusBadRequest,
		)

		return
	}

	if len(req.CourseType) > 30 ||
		len(req.CourseName) > 100 {

		http.Error(
			w,
			"Invalid course details",
			http.StatusBadRequest,
		)

		return
	}

	switch req.CourseType {
	case "foundation",
		"academic",
		"plus_two":
	default:
		http.Error(
			w,
			"Invalid course type",
			http.StatusBadRequest,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO course_applications
		(
			user_id,
			course_type,
			course_name
		)
		VALUES
		($1, $2, $3)
		`,
		session.UserID,
		req.CourseType,
		req.CourseName,
	)

	if err != nil {
		log.Println(
			"Course application database error:",
			err,
		)

		if strings.Contains(
			err.Error(),
			"course_applications_unique",
		) {
			http.Error(
				w,
				"Course already applied",
				http.StatusConflict,
			)

			return
		}

		http.Error(
			w,
			"Application failed",
			http.StatusInternalServerError,
		)

		return
	}

	var studentName string

	err = db.QueryRow(
		ctx,
		`
		SELECT name
		FROM users
		WHERE id = $1
		`,
		session.UserID,
	).Scan(&studentName)

	if err != nil {
		studentName = "Student"
	}

	recordAdminNotification(
		ctx,
		&session.UserID,
		"course_application",
		"New Course Application",
		"Student "+studentName+
			" (User ID: "+
			formatUserID(session.UserID)+
			") applied for "+
			req.CourseName+".",
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Course application successful",
		},
	)
}

func formatUserID(id int64) string {
	return "STU" + formatFourDigits(id)
}

func formatFourDigits(id int64) string {
	if id < 10 {
		return "000" + int64ToString(id)
	}

	if id < 100 {
		return "00" + int64ToString(id)
	}

	if id < 1000 {
		return "0" + int64ToString(id)
	}

	return int64ToString(id)
}

func int64ToString(value int64) string {
	switch {
	case value == 0:
		return "0"

	case value < 10:
		return string(rune('0' + value))

	default:
		var digits []byte

		for value > 0 {
			digit := byte(value%10) + '0'

			digits = append(
				[]byte{digit},
				digits...,
			)

			value /= 10
		}

		return string(digits)
	}
}

func securityHeaders(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			w.Header().Set(
				"X-Content-Type-Options",
				"nosniff",
			)

			w.Header().Set(
				"Referrer-Policy",
				"no-referrer",
			)

			next.ServeHTTP(
				w,
				r,
			)
		},
	)
}

func main() {
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		dbPassword := os.Getenv("DB_PASSWORD")

		if dbPassword == "" {
			log.Fatal(
				"DATABASE_URL or DB_PASSWORD environment variable is required",
			)
		}

		dsn =
			"postgres://postgres:" +
				dbPassword +
				"@localhost:5432/hand_in_handacademy"
	}

	var err error

	db, err = pgxpool.New(
		context.Background(),
		dsn,
	)

	if err != nil {
		log.Fatal(
			"Database connection failed:",
			err,
		)
	}

	if err := db.Ping(context.Background()); err != nil {
		db.Close()

		log.Fatal(
			"Database ping failed:",
			err,
		)
	}

	defer db.Close()

	log.Println(
		"PostgreSQL connected successfully",
	)

	_, err = db.Exec(
		context.Background(),
		`
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			phone TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'active',
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		`,
	)

	if err != nil {
		log.Fatal(
			"Users table creation failed:",
			err,
		)
	}

	log.Println(
		"Users table ready",
	)

	mux := http.NewServeMux()

	mux.HandleFunc(
		"/register",
		registerHandler,
	)

	mux.HandleFunc(
		"/login",
		loginHandler,
	)

	mux.HandleFunc(
		"/logout",
		logoutHandler,
	)

	mux.HandleFunc(
		"/session",
		sessionHandler,
	)

	mux.HandleFunc(
		"/apply-course",
		applyCourseHandler,
	)

	mux.HandleFunc(
		"/admin/register",
		adminRegisterHandler,
	)

	mux.HandleFunc(
		"/admin/login",
		adminLoginHandler,
	)

	mux.HandleFunc(
		"/admin/logout",
		adminLogoutHandler,
	)

	mux.HandleFunc(
		"/admin/session",
		adminSessionHandler,
	)

	mux.HandleFunc(
		"/admin/teachers",
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			if r.Method == http.MethodPost {
				addTeacherHandler(
					w,
					r,
				)

				return
			}

			if r.Method == http.MethodGet {
				getTeachersHandler(
					w,
					r,
				)

				return
			}

			if r.Method == http.MethodDelete {
				deleteTeacherHandler(
					w,
					r,
				)

				return
			}

			http.Error(
				w,
				"Method not allowed",
				http.StatusMethodNotAllowed,
			)
		},
	)

	mux.HandleFunc(
		"/admin/students",
		getStudentsHandler,
	)

	mux.HandleFunc(
		"/admin/applications",
		getApplicationsHandler,
	)

	mux.HandleFunc(
		"/admin/notifications",
		getNotificationsHandler,
	)

	mux.HandleFunc(
		"/admin/overview",
		adminOverviewHandler,
	)

	mux.HandleFunc(
		"/teacher/login",
		teacherLoginHandler,
	)

	mux.HandleFunc(
		"/teacher/session",
		teacherSessionHandler,
	)

	mux.HandleFunc(
		"/teacher/logout",
		teacherLogoutHandler,
	)

	mux.HandleFunc(
		"/teacher/change-password",
		teacherChangePasswordHandler,
	)

	mux.HandleFunc(
		"/teacher/profile",
		teacherProfileHandler,
	)

	fileServer := http.FileServer(
		http.Dir("."),
	)

	mux.HandleFunc(
		"/",
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			cleanPath := path.Clean(
				r.URL.Path,
			)

			if cleanPath == "/" {
				http.ServeFile(
					w,
					r,
					"index.html",
				)

				return
			}

			if cleanPath == "/admin.html" {
				if !requireAdminPage(
					w,
					r,
				) {
					return
				}

				http.ServeFile(
					w,
					r,
					"admin.html",
				)

				return
			}

			if strings.HasPrefix(
				cleanPath,
				"/css/",
			) ||
				strings.HasPrefix(
					cleanPath,
					"/js/",
				) ||
				strings.HasPrefix(
					cleanPath,
					"/img/",
				) {

				fileServer.ServeHTTP(
					w,
					r,
				)

				return
			}

			if strings.HasSuffix(
				cleanPath,
				".html",
			) &&
				!strings.Contains(
					strings.TrimPrefix(
						cleanPath,
						"/",
					),
					"/",
				) {

				fileServer.ServeHTTP(
					w,
					r,
				)

				return
			}

			http.NotFound(
				w,
				r,
			)
		},
	)

	handler :=
		corsMiddleware(
			securityHeaders(
				mux,
			),
		)

	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	log.Println(
		"Hand In Hand Academy running on port",
		port,
	)

	if err := http.ListenAndServe(
		":"+port,
		handler,
	); err != nil {
		log.Fatal(err)
	}
}
