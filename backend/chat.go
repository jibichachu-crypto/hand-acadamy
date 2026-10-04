package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

/* ============================================================
   CHAT DATABASE TABLE SETUP
============================================================ */

var (
	chatTableMu    sync.Mutex
	chatTablesReady bool
)

func ensureChatTables(ctx context.Context) error {
	chatTableMu.Lock()
	defer chatTableMu.Unlock()

	if chatTablesReady {
		return nil
	}

	if db == nil {
		return fmt.Errorf("user database connection is nil")
	}

	/* ========================================================
	   CHAT MESSAGES
	======================================================== */

	_, err := db.Exec(
		ctx,
		`
		CREATE TABLE IF NOT EXISTS public.chat_messages (
			id BIGSERIAL PRIMARY KEY,

			sender_type VARCHAR(20) NOT NULL,
			sender_id BIGINT NOT NULL,

			receiver_type VARCHAR(20) NOT NULL,
			receiver_id BIGINT NOT NULL,

			message TEXT NOT NULL,

			is_read BOOLEAN NOT NULL DEFAULT FALSE,

			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

			CONSTRAINT chat_sender_type_check
				CHECK (
					sender_type IN ('user', 'admin', 'system')
				),

			CONSTRAINT chat_receiver_type_check
				CHECK (
					receiver_type IN ('user', 'admin')
				)
		)
		`,
	)

	if err != nil {
		return err
	}

	/* ========================================================
	   CHAT INDEXES
	======================================================== */

	_, err = db.Exec(
		ctx,
		`
		CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
		ON public.chat_messages(sender_type, sender_id)
		`,
	)

	if err != nil {
		return err
	}

	_, err = db.Exec(
		ctx,
		`
		CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver
		ON public.chat_messages(receiver_type, receiver_id)
		`,
	)

	if err != nil {
		return err
	}

	_, err = db.Exec(
		ctx,
		`
		CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
		ON public.chat_messages(created_at DESC)
		`,
	)

	if err != nil {
		return err
	}

	/* ========================================================
	   USER NOTIFICATIONS
	======================================================== */

	_, err = db.Exec(
		ctx,
		`
		CREATE TABLE IF NOT EXISTS public.user_notifications (
			id BIGSERIAL PRIMARY KEY,

			user_id BIGINT NOT NULL,

			title VARCHAR(200) NOT NULL,

			message TEXT NOT NULL,

			is_read BOOLEAN NOT NULL DEFAULT FALSE,

			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

			CONSTRAINT fk_user_notification_user
				FOREIGN KEY (user_id)
				REFERENCES public.users(id)
				ON DELETE CASCADE
		)
		`,
	)

	if err != nil {
		return err
	}

	/* ========================================================
	   USER NOTIFICATION INDEXES
	======================================================== */

	_, err = db.Exec(
		ctx,
		`
		CREATE INDEX IF NOT EXISTS idx_user_notifications_user
		ON public.user_notifications(user_id)
		`,
	)

	if err != nil {
		return err
	}

	_, err = db.Exec(
		ctx,
		`
		CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
		ON public.user_notifications(user_id, is_read)
		`,
	)

	if err != nil {
		return err
	}

	chatTablesReady = true

	log.Println("Chat tables ready")

	return nil
}

/* ============================================================
   CHAT MESSAGE TYPES
============================================================ */

type ChatMessage struct {
	ID           int64     `json:"id"`
	SenderType   string    `json:"sender_type"`
	SenderID     int64     `json:"sender_id"`
	ReceiverType string    `json:"receiver_type"`
	ReceiverID   int64     `json:"receiver_id"`
	Message      string    `json:"message"`
	IsRead       bool      `json:"is_read"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserChatSendRequest struct {
	Message string `json:"message"`
	AdminID int64  `json:"admin_id"`
}

type AdminChatSendRequest struct {
	UserID  int64  `json:"user_id"`
	Message string `json:"message"`
}

/* ============================================================
   WEBSOCKET CLIENT
============================================================ */

type chatClient struct {
	conn *websocket.Conn

	writeMu sync.Mutex

	done chan struct{}
}

/* ============================================================
   CONNECTED CLIENTS
============================================================ */

var (
	chatClientsMu sync.RWMutex

	userChatClients = make(
		map[int64]map[*chatClient]struct{},
	)

	adminChatClients = make(
		map[int64]map[*chatClient]struct{},
	)
)

/* ============================================================
   REGISTER USER CLIENT
============================================================ */

func registerUserChatClient(
	userID int64,
	client *chatClient,
) {
	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	if userChatClients[userID] == nil {
		userChatClients[userID] =
			make(map[*chatClient]struct{})
	}

	userChatClients[userID][client] = struct{}{}
}

/* ============================================================
   UNREGISTER USER CLIENT
============================================================ */

func unregisterUserChatClient(
	userID int64,
	client *chatClient,
) {
	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	clients :=
		userChatClients[userID]

	if clients == nil {
		return
	}

	delete(
		clients,
		client,
	)

	if len(clients) == 0 {
		delete(
			userChatClients,
			userID,
		)
	}
}

/* ============================================================
   REGISTER ADMIN CLIENT
============================================================ */

func registerAdminChatClient(
	adminID int64,
	client *chatClient,
) {
	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	if adminChatClients[adminID] == nil {
		adminChatClients[adminID] =
			make(map[*chatClient]struct{})
	}

	adminChatClients[adminID][client] = struct{}{}
}

/* ============================================================
   UNREGISTER ADMIN CLIENT
============================================================ */

func unregisterAdminChatClient(
	adminID int64,
	client *chatClient,
) {
	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	clients :=
		adminChatClients[adminID]

	if clients == nil {
		return
	}

	delete(
		clients,
		client,
	)

	if len(clients) == 0 {
		delete(
			adminChatClients,
			adminID,
		)
	}
}

/* ============================================================
   CLIENT WRITE
============================================================ */

func (client *chatClient) writeJSON(
	value interface{},
) error {
	client.writeMu.Lock()
	defer client.writeMu.Unlock()

	return client.conn.WriteJSON(value)
}

/* ============================================================
   CLIENT PING LOOP
============================================================ */

func (client *chatClient) pingLoop() {
	ticker :=
		time.NewTicker(25 * time.Second)

	defer ticker.Stop()

	for {
		select {

		case <-ticker.C:

			_ = client.conn.WriteControl(
				websocket.PingMessage,
				[]byte("ping"),
				time.Now().Add(5*time.Second),
			)

		case <-client.done:

			return
		}
	}
}

/* ============================================================
   BROADCAST TO USER
============================================================ */

func broadcastToUser(
	userID int64,
	message ChatMessage,
) {
	chatClientsMu.RLock()

	clientsMap := userChatClients[userID]

	clients := make(
		[]*chatClient,
		0,
		len(clientsMap),
	)

	for client := range clientsMap {
		clients = append(
			clients,
			client,
		)
	}

	chatClientsMu.RUnlock()

	for _, client := range clients {
		if err := client.writeJSON(
			message,
		); err != nil {
			_ = client.conn.Close()
		}
	}
}

/* ============================================================
   BROADCAST TO ADMIN
============================================================ */

func broadcastToAdmin(
	adminID int64,
	message ChatMessage,
) {
	chatClientsMu.RLock()

	clientsMap := adminChatClients[adminID]

	clients := make(
		[]*chatClient,
		0,
		len(clientsMap),
	)

	for client := range clientsMap {
		clients = append(
			clients,
			client,
		)
	}

	chatClientsMu.RUnlock()

	for _, client := range clients {
		if err := client.writeJSON(
			message,
		); err != nil {
			_ = client.conn.Close()
		}
	}
}

/* ============================================================
   BROADCAST MESSAGE
============================================================ */

func broadcastChatMessage(
	message ChatMessage,
) {
	switch message.SenderType {

	case "user":

		broadcastToUser(
			message.SenderID,
			message,
		)

		if message.ReceiverType == "admin" {
			broadcastToAdmin(
				message.ReceiverID,
				message,
			)
		}

	case "admin":

		broadcastToAdmin(
			message.SenderID,
			message,
		)

		if message.ReceiverType == "user" {
			broadcastToUser(
				message.ReceiverID,
				message,
			)
		}

	case "system":

		if message.ReceiverType == "user" {
			broadcastToUser(
				message.ReceiverID,
				message,
			)
		}
	}
}

/* ============================================================
   ACTIVE ADMIN
============================================================ */

func getActiveAdminID(
	ctx context.Context,
) (int64, error) {
	if adminDB == nil {
		return 0, fmt.Errorf(
			"admin database connection is nil",
		)
	}

	var adminID int64

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT id
		FROM admin.admins
		WHERE status = 'active'
		ORDER BY id
		LIMIT 1
		`,
	).Scan(&adminID)

	if err != nil {
		return 0, err
	}

	return adminID, nil
}

/* ============================================================
   SAVE CHAT MESSAGE
============================================================ */

func saveChatMessage(
	ctx context.Context,

	senderType string,
	senderID int64,

	receiverType string,
	receiverID int64,

	message string,
) (ChatMessage, error) {

	if err := ensureChatTables(
		ctx,
	); err != nil {
		return ChatMessage{}, err
	}

	message = strings.TrimSpace(message)

	if message == "" {
		return ChatMessage{},
			fmt.Errorf("message is empty")
	}

	if len(message) > 2000 {
		return ChatMessage{},
			fmt.Errorf(
				"message is too long",
			)
	}

	var result ChatMessage

	err := db.QueryRow(
		ctx,
		`
		INSERT INTO public.chat_messages
		(
			sender_type,
			sender_id,
			receiver_type,
			receiver_id,
			message
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4,
			$5
		)
		RETURNING
			id,
			sender_type,
			sender_id,
			receiver_type,
			receiver_id,
			message,
			is_read,
			created_at
		`,
		senderType,
		senderID,
		receiverType,
		receiverID,
		message,
	).Scan(
		&result.ID,
		&result.SenderType,
		&result.SenderID,
		&result.ReceiverType,
		&result.ReceiverID,
		&result.Message,
		&result.IsRead,
		&result.CreatedAt,
	)

	if err != nil {
		return ChatMessage{}, err
	}

	return result, nil
}

/* ============================================================
   USER CHAT MESSAGE API
============================================================ */

func userChatMessagesHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet &&
		r.Method != http.MethodPost {

		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	cookie, err :=
		r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
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

	if r.Method == http.MethodGet {
		getUserChatMessages(
			w,
			ctx,
			session.UserID,
		)

		return
	}

	sendUserChatMessage(
		w,
		ctx,
		session.UserID,
		r,
	)
}

/* ============================================================
   GET USER CHAT HISTORY
============================================================ */

func getUserChatMessages(
	w http.ResponseWriter,
	ctx context.Context,
	userID int64,
) {
	if err := ensureChatTables(
		ctx,
	); err != nil {

		log.Println(
			"Chat table error:",
			err,
		)

		http.Error(
			w,
			"Chat service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	/* ========================================================
	   MARK ADMIN MESSAGES AS READ
	======================================================== */

	_, _ = db.Exec(
		ctx,
		`
		UPDATE public.chat_messages
		SET is_read = TRUE
		WHERE receiver_type = 'user'
		  AND receiver_id = $1
		  AND is_read = FALSE
		`,
		userID,
	)

	rows, err := db.Query(
		ctx,
		`
		SELECT
			id,
			sender_type,
			sender_id,
			receiver_type,
			receiver_id,
			message,
			is_read,
			created_at
		FROM public.chat_messages
		WHERE
			(
				sender_type = 'user'
				AND sender_id = $1
			)
			OR
			(
				receiver_type = 'user'
				AND receiver_id = $1
			)
		ORDER BY id ASC
		LIMIT 500
		`,
		userID,
	)

	if err != nil {
		log.Println(
			"User chat query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load chat",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	messages := make(
		[]ChatMessage,
		0,
	)

	for rows.Next() {

		var message ChatMessage

		if err := rows.Scan(
			&message.ID,
			&message.SenderType,
			&message.SenderID,
			&message.ReceiverType,
			&message.ReceiverID,
			&message.Message,
			&message.IsRead,
			&message.CreatedAt,
		); err != nil {

			continue
		}

		messages = append(
			messages,
			message,
		)
	}

	var unreadCount int64

	_ = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM public.chat_messages
		WHERE receiver_type = 'user'
		  AND receiver_id = $1
		  AND is_read = FALSE
		`,
		userID,
	).Scan(&unreadCount)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"messages":     messages,
			"unread_count": unreadCount,
		},
	)
}

/* ============================================================
   SEND USER MESSAGE
============================================================ */

func sendUserChatMessage(
	w http.ResponseWriter,
	ctx context.Context,
	userID int64,
	r *http.Request,
) {
	var req UserChatSendRequest

	r.Body =
		http.MaxBytesReader(
			w,
			r.Body,
			16<<10,
		)

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

	req.Message =
		strings.TrimSpace(
			req.Message,
		)

	if req.Message == "" {
		http.Error(
			w,
			"Message is required",
			http.StatusBadRequest,
		)

		return
	}

	adminID := req.AdminID

	if adminID <= 0 {

		var err error

		adminID, err =
			getActiveAdminID(ctx)

		if err != nil {

			log.Println(
				"Active admin lookup error:",
				err,
			)

			http.Error(
				w,
				"No active admin available",
				http.StatusServiceUnavailable,
			)

			return
		}
	}

	/* ========================================================
	   CHECK ADMIN EXISTS
	======================================================== */

	var exists bool

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM admin.admins
			WHERE id = $1
			  AND status = 'active'
		)
		`,
		adminID,
	).Scan(&exists)

	if err != nil || !exists {

		http.Error(
			w,
			"Admin not available",
			http.StatusServiceUnavailable,
		)

		return
	}

	message, err :=
		saveChatMessage(
			ctx,
			"user",
			userID,
			"admin",
			adminID,
			req.Message,
		)

	if err != nil {

		log.Println(
			"User chat save error:",
			err,
		)

		http.Error(
			w,
			"Unable to send message",
			http.StatusInternalServerError,
		)

		return
	}

	/* ========================================================
	   ADMIN NOTIFICATION
	======================================================== */

	userIDCopy := userID

	recordAdminNotification(
		ctx,
		&userIDCopy,
		"chat_message",
		"New Chat Message",
		"A student sent a new chat message.",
	)

	broadcastChatMessage(
		message,
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":    "Message sent successfully",
			"id":         message.ID,
			"created_at": message.CreatedAt,
			"sender_type": message.SenderType,
			"sender_id":   message.SenderID,
			"receiver_type": message.ReceiverType,
			"receiver_id":   message.ReceiverID,
		},
	)
}

/* ============================================================
   ADMIN CHAT USERS
============================================================ */

func adminChatUsersHandler(
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

	cookie, err :=
		r.Cookie("hih_admin_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	adminSession, ok :=
		getAdminSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
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

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Chat service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			u.id,
			u.name,
			u.email,
			u.phone,
			COALESCE(
				MAX(cm.created_at),
				u.created_at
			) AS last_activity,

			COUNT(
				CASE
					WHEN cm.sender_type = 'user'
					 AND cm.sender_id = u.id
					 AND cm.receiver_type = 'admin'
					 AND cm.receiver_id = $1
					 AND cm.is_read = FALSE
					THEN 1
				END
			) AS unread_count

		FROM public.users u

		LEFT JOIN public.chat_messages cm
			ON
			(
				(
					cm.sender_type = 'user'
					AND cm.sender_id = u.id
				)
				OR
				(
					cm.receiver_type = 'user'
					AND cm.receiver_id = u.id
				)
			)

		GROUP BY
			u.id,
			u.name,
			u.email,
			u.phone,
			u.created_at

		ORDER BY
			last_activity DESC
		`,
		adminSession.AdminID,
	)

	if err != nil {
		log.Println(
			"Admin chat users query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load chat users",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	type ChatUser struct {
		UserID      int64     `json:"user_id"`
		Name        string    `json:"name"`
		Email       string    `json:"email"`
		Phone       string    `json:"phone"`
		LastActivity time.Time `json:"last_activity"`
		UnreadCount int64     `json:"unread_count"`
	}

	users := make(
		[]ChatUser,
		0,
	)

	for rows.Next() {

		var user ChatUser

		if err := rows.Scan(
			&user.UserID,
			&user.Name,
			&user.Email,
			&user.Phone,
			&user.LastActivity,
			&user.UnreadCount,
		); err != nil {

			continue
		}

		users = append(
			users,
			user,
		)
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"users": users,
		},
	)
}

/* ============================================================
   ADMIN CHAT MESSAGES
============================================================ */

func adminChatMessagesHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet &&
		r.Method != http.MethodPost {

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

	cookie, err :=
		r.Cookie("hih_admin_session")

	if err != nil || cookie.Value == "" {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	adminSession, ok :=
		getAdminSession(cookie.Value)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
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

	if r.Method == http.MethodGet {

		getAdminChatMessages(
			w,
			ctx,
			adminSession.AdminID,
			r,
		)

		return
	}

	sendAdminChatMessage(
		w,
		ctx,
		adminSession.AdminID,
		r,
	)
}

/* ============================================================
   GET ADMIN CHAT HISTORY
============================================================ */

func getAdminChatMessages(
	w http.ResponseWriter,
	ctx context.Context,
	adminID int64,
	r *http.Request,
) {
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

	userID, err :=
		strconv.ParseInt(
			userIDText,
			10,
			64,
		)

	if err != nil || userID <= 0 {
		http.Error(
			w,
			"Invalid User ID",
			http.StatusBadRequest,
		)

		return
	}

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Chat service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	/* ========================================================
	   MARK USER MESSAGES AS READ
	======================================================== */

	_, _ = db.Exec(
		ctx,
		`
		UPDATE public.chat_messages
		SET is_read = TRUE
		WHERE sender_type = 'user'
		  AND sender_id = $1
		  AND receiver_type = 'admin'
		  AND receiver_id = $2
		  AND is_read = FALSE
		`,
		userID,
		adminID,
	)

	rows, err := db.Query(
		ctx,
		`
		SELECT
			id,
			sender_type,
			sender_id,
			receiver_type,
			receiver_id,
			message,
			is_read,
			created_at
		FROM public.chat_messages
		WHERE
			(
				sender_type = 'user'
				AND sender_id = $1
			)
			OR
			(
				receiver_type = 'user'
				AND receiver_id = $1
			)
		ORDER BY id ASC
		LIMIT 500
		`,
		userID,
	)

	if err != nil {
		log.Println(
			"Admin chat query error:",
			err,
		)

		http.Error(
			w,
			"Unable to load chat",
			http.StatusInternalServerError,
		)

		return
	}

	defer rows.Close()

	messages := make(
		[]ChatMessage,
		0,
	)

	for rows.Next() {

		var message ChatMessage

		if err := rows.Scan(
			&message.ID,
			&message.SenderType,
			&message.SenderID,
			&message.ReceiverType,
			&message.ReceiverID,
			&message.Message,
			&message.IsRead,
			&message.CreatedAt,
		); err != nil {

			continue
		}

		messages = append(
			messages,
			message,
		)
	}

	var unreadCount int64

	_ = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM public.chat_messages
		WHERE sender_type = 'user'
		  AND sender_id = $1
		  AND receiver_type = 'admin'
		  AND receiver_id = $2
		  AND is_read = FALSE
		`,
		userID,
		adminID,
	).Scan(&unreadCount)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"messages":     messages,
			"unread_count": unreadCount,
			"user_id":      userID,
		},
	)
}

/* ============================================================
   SEND ADMIN MESSAGE
============================================================ */

func sendAdminChatMessage(
	w http.ResponseWriter,
	ctx context.Context,
	adminID int64,
	r *http.Request,
) {
	r.Body =
		http.MaxBytesReader(
			w,
			r.Body,
			16<<10,
		)

	var req AdminChatSendRequest

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

	req.Message =
		strings.TrimSpace(
			req.Message,
		)

	if req.UserID <= 0 {
		http.Error(
			w,
			"User ID is required",
			http.StatusBadRequest,
		)

		return
	}

	if req.Message == "" {
		http.Error(
			w,
			"Message is required",
			http.StatusBadRequest,
		)

		return
	}

	/* ========================================================
	   CHECK USER
	======================================================== */

	var userExists bool

	err := db.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM public.users
			WHERE id = $1
		)
		`,
		req.UserID,
	).Scan(&userExists)

	if err != nil || !userExists {

		http.Error(
			w,
			"User not found",
			http.StatusNotFound,
		)

		return
	}

	message, err :=
		saveChatMessage(
			ctx,
			"admin",
			adminID,
			"user",
			req.UserID,
			req.Message,
		)

	if err != nil {

		log.Println(
			"Admin chat save error:",
			err,
		)

		http.Error(
			w,
			"Unable to send message",
			http.StatusInternalServerError,
		)

		return
	}

	/* ========================================================
	   USER NOTIFICATION
	======================================================== */

	createUserNotification(
		ctx,
		req.UserID,
		"New message from Hand In Hand Academy",
		req.Message,
	)

	broadcastChatMessage(
		message,
	)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message":      "Message sent successfully",
			"id":           message.ID,
			"created_at":   message.CreatedAt,
			"sender_type":  message.SenderType,
			"sender_id":    message.SenderID,
			"receiver_type": message.ReceiverType,
			"receiver_id":   message.ReceiverID,
		},
	)
}

/* ============================================================
   USER NOTIFICATIONS
============================================================ */

func userNotificationsHandler(
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
		r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
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

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Notification service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	type UserNotification struct {
		ID        int64     `json:"id"`
		UserID    int64     `json:"user_id"`
		Title     string    `json:"title"`
		Message   string    `json:"message"`
		IsRead    bool      `json:"is_read"`
		CreatedAt time.Time `json:"created_at"`
	}

	rows, err := db.Query(
		ctx,
		`
		SELECT
			id,
			user_id,
			title,
			message,
			is_read,
			created_at
		FROM public.user_notifications
		WHERE user_id = $1
		ORDER BY id DESC
		LIMIT 100
		`,
		session.UserID,
	)

	if err != nil {
		log.Println(
			"User notifications query error:",
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

	notifications := make(
		[]UserNotification,
		0,
	)

	for rows.Next() {

		var notification UserNotification

		if err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Title,
			&notification.Message,
			&notification.IsRead,
			&notification.CreatedAt,
		); err != nil {

			continue
		}

		notifications =
			append(
				notifications,
				notification,
			)
	}

	var unreadCount int64

	_ = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM public.user_notifications
		WHERE user_id = $1
		  AND is_read = FALSE
		`,
		session.UserID,
	).Scan(&unreadCount)

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	json.NewEncoder(w).Encode(
		map[string]interface{}{
			"notifications": notifications,
			"unread_count":  unreadCount,
		},
	)
}

/* ============================================================
   MARK USER NOTIFICATIONS READ
============================================================ */

func markUserNotificationsReadHandler(
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
		r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {
		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getSession(cookie.Value)

	if !ok {
		http.Error(
			w,
			"Unauthorized",
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

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Notification service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	_, err = db.Exec(
		ctx,
		`
		UPDATE public.user_notifications
		SET is_read = TRUE
		WHERE user_id = $1
		`,
		session.UserID,
	)

	if err != nil {
		http.Error(
			w,
			"Unable to update notifications",
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
			"message": "Notifications marked as read",
		},
	)
}

/* ============================================================
   CREATE USER NOTIFICATION
============================================================ */

func createUserNotification(
	ctx context.Context,
	userID int64,
	title string,
	message string,
) {
	if db == nil {
		return
	}

	if err := ensureChatTables(
		ctx,
	); err != nil {
		log.Println(
			"User notification table error:",
			err,
		)

		return
	}

	_, err := db.Exec(
		ctx,
		`
		INSERT INTO public.user_notifications
		(
			user_id,
			title,
			message
		)
		VALUES
		(
			$1,
			$2,
			$3
		)
		`,
		userID,
		title,
		message,
	)

	if err != nil {
		log.Println(
			"User notification insert error:",
			err,
		)
	}
}

/* ============================================================
   COURSE APPLICATION AUTO REPLY

   Call this after a successful course application.
============================================================ */

func createCourseApplicationAutoReply(
	ctx context.Context,
	userID int64,
) {
	adminID, err :=
		getActiveAdminID(ctx)

	if err != nil {
		log.Println(
			"Auto-reply admin lookup error:",
			err,
		)

		return
	}

	const autoReply =
		"Your course application has been received successfully.\n" +
			"Our team will review it and contact you soon."

	message, err :=
		saveChatMessage(
			ctx,
			"admin",
			adminID,
			"user",
			userID,
			autoReply,
		)

	if err != nil {
		log.Println(
			"Auto-reply chat save error:",
			err,
		)

		return
	}

	createUserNotification(
		ctx,
		userID,
		"Course Application Received",
		autoReply,
	)

	broadcastChatMessage(
		message,
	)
}

/* ============================================================
   WEBSOCKET ORIGIN CHECK
============================================================ */

func chatCheckOrigin(
	r *http.Request,
) bool {
	origin := strings.TrimSpace(
		r.Header.Get("Origin"),
	)

	if origin == "" {
		return true
	}

	parsed, err :=
		url.Parse(origin)

	if err != nil {
		return false
	}

	return strings.EqualFold(
		parsed.Host,
		r.Host,
	)
}

/* ============================================================
   WEBSOCKET UPGRADER
============================================================ */

var chatUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,

	CheckOrigin: chatCheckOrigin,
}

/* ============================================================
   USER WEBSOCKET
============================================================ */

func userChatWebSocketHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	cookie, err :=
		r.Cookie("hih_session")

	if err != nil || cookie.Value == "" {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	session, ok :=
		getSession(cookie.Value)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
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

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Chat service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	conn, err :=
		chatUpgrader.Upgrade(
			w,
			r,
			nil,
		)

	if err != nil {
		log.Println(
			"User websocket upgrade error:",
			err,
		)

		return
	}

	client := &chatClient{
		conn: conn,
		done: make(chan struct{}),
	}

	registerUserChatClient(
		session.UserID,
		client,
	)

	defer func() {

		close(client.done)

		unregisterUserChatClient(
			session.UserID,
			client,
		)

		_ = client.conn.Close()

	}()

	_ = client.writeJSON(
		map[string]interface{}{
			"type":          "connected",
			"authenticated": true,
			"user_id":      session.UserID,
		},
	)

	go client.pingLoop()

	chatWebSocketReadLoop(
		client,
		"user",
		session.UserID,
	)
}

/* ============================================================
   ADMIN WEBSOCKET
============================================================ */

func adminChatWebSocketHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	cookie, err :=
		r.Cookie("hih_admin_session")

	if err != nil || cookie.Value == "" {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	adminSession, ok :=
		getAdminSession(cookie.Value)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
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

	if err := ensureChatTables(
		ctx,
	); err != nil {

		http.Error(
			w,
			"Chat service unavailable",
			http.StatusInternalServerError,
		)

		return
	}

	conn, err :=
		chatUpgrader.Upgrade(
			w,
			r,
			nil,
		)

	if err != nil {
		log.Println(
			"Admin websocket upgrade error:",
			err,
		)

		return
	}

	client := &chatClient{
		conn: conn,
		done: make(chan struct{}),
	}

	registerAdminChatClient(
		adminSession.AdminID,
		client,
	)

	defer func() {

		close(client.done)

		unregisterAdminChatClient(
			adminSession.AdminID,
			client,
		)

		_ = client.conn.Close()

	}()

	_ = client.writeJSON(
		map[string]interface{}{
			"type":          "connected",
			"authenticated": true,
			"admin_id":      adminSession.AdminID,
		},
	)

	go client.pingLoop()

	chatWebSocketReadLoop(
		client,
		"admin",
		adminSession.AdminID,
	)
}

/* ============================================================
   WEBSOCKET INCOMING MESSAGE
============================================================ */

type chatWebSocketIncoming struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	UserID  int64  `json:"user_id"`
	AdminID int64  `json:"admin_id"`
}

/* ============================================================
   WEBSOCKET READ LOOP
============================================================ */

func chatWebSocketReadLoop(
	client *chatClient,
	senderType string,
	senderID int64,
) {
	client.conn.SetReadLimit(
		8 << 10,
	)

	_ = client.conn.SetReadDeadline(
		time.Now().Add(
			90 * time.Second,
		),
	)

	client.conn.SetPongHandler(
		func(string) error {

			return client.conn.SetReadDeadline(
				time.Now().Add(
					90 * time.Second,
				),
			)
		},
	)

	for {

		_, data, err :=
			client.conn.ReadMessage()

		if err != nil {
			return
		}

		var incoming chatWebSocketIncoming

		if err := json.Unmarshal(
			data,
			&incoming,
		); err != nil {

			_ = client.writeJSON(
				map[string]interface{}{
					"type":  "error",
					"error": "Invalid message format.",
				},
			)

			continue
		}

		if strings.ToLower(
			strings.TrimSpace(
				incoming.Type,
			),
		) != "message" {

			continue
		}

		incoming.Message =
			strings.TrimSpace(
				incoming.Message,
			)

		if incoming.Message == "" {
			continue
		}

		ctx, cancel :=
			context.WithTimeout(
				context.Background(),
				5*time.Second,
			)

		if senderType == "user" {

			adminID := incoming.AdminID

			if adminID <= 0 {

				adminID, err =
					getActiveAdminID(ctx)

				if err != nil {

					cancel()

					_ = client.writeJSON(
						map[string]interface{}{
							"type": "error",
							"error":
								"No active admin available.",
						},
					)

					continue
				}
			}

			message, saveErr :=
				saveChatMessage(
					ctx,
					"user",
					senderID,
					"admin",
					adminID,
					incoming.Message,
				)

			if saveErr != nil {

				cancel()

				_ = client.writeJSON(
					map[string]interface{}{
						"type": "error",
						"error":
							"Unable to send message.",
					},
				)

				continue
			}

			userIDCopy := senderID

			recordAdminNotification(
				ctx,
				&userIDCopy,
				"chat_message",
				"New Chat Message",
				"A student sent a new chat message.",
			)

			cancel()

			broadcastChatMessage(
				message,
			)

			continue
		}

		if senderType == "admin" {

			if incoming.UserID <= 0 {

				cancel()

				_ = client.writeJSON(
					map[string]interface{}{
						"type": "error",
						"error":
							"User ID is required.",
					},
				)

				continue
			}

			message, saveErr :=
				saveChatMessage(
					ctx,
					"admin",
					senderID,
					"user",
					incoming.UserID,
					incoming.Message,
				)

			if saveErr != nil {

				cancel()

				_ = client.writeJSON(
					map[string]interface{}{
						"type": "error",
						"error":
							"Unable to send message.",
					},
				)

				continue
			}

			createUserNotification(
				ctx,
				incoming.UserID,
				"New message from Hand In Hand Academy",
				incoming.Message,
			)

			cancel()

			broadcastChatMessage(
				message,
			)

			continue
		}

		cancel()
	}
}
