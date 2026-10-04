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

// ============================================================
// CHAT CONSTANTS
// ============================================================

const (
	maxChatMessageLength = 2000
	chatHistoryLimit     = 200

	userChatCookieName  = "hih_session"
	adminChatCookieName = "hih_admin_session"
)

// ============================================================
// CHAT MESSAGE
// ============================================================

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

// ============================================================
// USER CHAT REQUEST
// ============================================================

type UserChatSendRequest struct {
	Message string `json:"message"`
}

// ============================================================
// ADMIN CHAT REQUEST
// ============================================================

type AdminChatSendRequest struct {
	UserID  int64  `json:"user_id"`
	Message string `json:"message"`
}

// ============================================================
// WEBSOCKET CLIENT
// ============================================================

type chatClient struct {
	conn *websocket.Conn

	writeMu sync.Mutex
}

// ============================================================
// WEBSOCKET HUBS
// ============================================================

var (
	userChatClients = make(map[int64]map[*chatClient]struct{})
	adminChatClients = make(map[int64]map[*chatClient]struct{})

	chatClientsMu sync.RWMutex
)

// ============================================================
// WEBSOCKET UPGRADER
// ============================================================

var chatUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	HandshakeTimeout: 10 * time.Second,

	CheckOrigin: chatCheckOrigin,
}

// ============================================================
// CHAT TABLES
// ============================================================

func ensureChatTables(ctx context.Context) error {

	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

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
				CHECK (sender_type IN ('user', 'admin', 'system')),

			CONSTRAINT chat_receiver_type_check
				CHECK (receiver_type IN ('user', 'admin'))
		);

		CREATE INDEX IF NOT EXISTS idx_chat_sender
			ON public.chat_messages(sender_type, sender_id);

		CREATE INDEX IF NOT EXISTS idx_chat_receiver
			ON public.chat_messages(receiver_type, receiver_id);

		CREATE INDEX IF NOT EXISTS idx_chat_created_at
			ON public.chat_messages(created_at);

		CREATE TABLE IF NOT EXISTS public.user_notifications (
			id BIGSERIAL PRIMARY KEY,

			user_id BIGINT NOT NULL,

			type VARCHAR(50) NOT NULL DEFAULT 'general',

			title VARCHAR(200) NOT NULL,

			message TEXT NOT NULL,

			is_read BOOLEAN NOT NULL DEFAULT FALSE,

			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

			CONSTRAINT fk_user_notification_user
				FOREIGN KEY (user_id)
				REFERENCES public.users(id)
				ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_user_notifications_user
			ON public.user_notifications(user_id);

		CREATE INDEX IF NOT EXISTS idx_user_notifications_read
			ON public.user_notifications(user_id, is_read);

		CREATE INDEX IF NOT EXISTS idx_user_notifications_created
			ON public.user_notifications(created_at);
		`,
	)

	if err != nil {
		return fmt.Errorf("chat tables creation failed: %w", err)
	}

	return nil
}

// ============================================================
// MESSAGE CLIENT WRITE
// ============================================================

func (c *chatClient) writeJSON(value interface{}) error {

	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	_ = c.conn.SetWriteDeadline(
		time.Now().Add(10 * time.Second),
	)

	return c.conn.WriteJSON(value)
}

// ============================================================
// PING LOOP
// ============================================================

func (c *chatClient) pingLoop() {

	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	for range ticker.C {

		_ = c.conn.SetWriteDeadline(
			time.Now().Add(10 * time.Second),
		)

		err := c.conn.WriteControl(
			websocket.PingMessage,
			nil,
			time.Now().Add(10*time.Second),
		)

		if err != nil {
			return
		}
	}
}

// ============================================================
// ORIGIN CHECK
// ============================================================

func chatCheckOrigin(r *http.Request) bool {

	origin := strings.TrimSpace(
		r.Header.Get("Origin"),
	)

	if origin == "" {
		return true
	}

	parsed, err := url.Parse(origin)

	if err != nil {
		return false
	}

	return parsed.Host == r.Host
}

// ============================================================
// REGISTER USER CLIENT
// ============================================================

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

// ============================================================
// UNREGISTER USER CLIENT
// ============================================================

func unregisterUserChatClient(
	userID int64,
	client *chatClient,
) {

	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	clients := userChatClients[userID]

	if clients == nil {
		return
	}

	delete(clients, client)

	if len(clients) == 0 {
		delete(userChatClients, userID)
	}
}

// ============================================================
// REGISTER ADMIN CLIENT
// ============================================================

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

// ============================================================
// UNREGISTER ADMIN CLIENT
// ============================================================

func unregisterAdminChatClient(
	adminID int64,
	client *chatClient,
) {

	chatClientsMu.Lock()
	defer chatClientsMu.Unlock()

	clients := adminChatClients[adminID]

	if clients == nil {
		return
	}

	delete(clients, client)

	if len(clients) == 0 {
		delete(adminChatClients, adminID)
	}
}

// ============================================================
// BROADCAST TO USER
// ============================================================

func broadcastToUser(
	userID int64,
	message ChatMessage,
) {

	chatClientsMu.RLock()

	clients := make(
		[]*chatClient,
		0,
		len(userChatClients[userID]),
	)

	for client := range userChatClients[userID] {
		clients = append(clients, client)
	}

	chatClientsMu.RUnlock()

	// IMPORTANT:
	// Frontend expects:
	// {
	//   "type": "message",
	//   "message": { ... }
	// }

	for _, client := range clients {

		if err := client.writeJSON(
			map[string]interface{}{
				"type":    "message",
				"message": message,
			},
		); err != nil {

			_ = client.conn.Close()
		}
	}
}

// ============================================================
// BROADCAST TO ADMIN
// ============================================================

func broadcastToAdmin(
	adminID int64,
	message ChatMessage,
) {

	chatClientsMu.RLock()

	clients := make(
		[]*chatClient,
		0,
		len(adminChatClients[adminID]),
	)

	for client := range adminChatClients[adminID] {
		clients = append(clients, client)
	}

	chatClientsMu.RUnlock()

	// IMPORTANT:
	// Frontend expects:
	// {
	//   "type": "message",
	//   "message": { ... }
	// }

	for _, client := range clients {

		if err := client.writeJSON(
			map[string]interface{}{
				"type":    "message",
				"message": message,
			},
		); err != nil {

			_ = client.conn.Close()
		}
	}
}

// ============================================================
// BROADCAST MESSAGE
// ============================================================

func broadcastChatMessage(
	message ChatMessage,
) {

	if message.ReceiverType == "user" {

		broadcastToUser(
			message.ReceiverID,
			message,
		)

		return
	}

	if message.ReceiverType == "admin" {

		if message.ReceiverID > 0 {

			broadcastToAdmin(
				message.ReceiverID,
				message,
			)

			return
		}

		// Receiver ID 0 = all admins

		chatClientsMu.RLock()

		adminIDs := make(
			[]int64,
			0,
			len(adminChatClients),
		)

		for adminID := range adminChatClients {
			adminIDs = append(adminIDs, adminID)
		}

		chatClientsMu.RUnlock()

		for _, adminID := range adminIDs {

			broadcastToAdmin(
				adminID,
				message,
			)
		}
	}
}

// ============================================================
// ACTIVE ADMIN ID
// ============================================================

func getActiveAdminID(
	ctx context.Context,
) int64 {

	if adminDB == nil {
		return 0
	}

	var adminID int64

	err := adminDB.QueryRow(
		ctx,
		`
		SELECT id
		FROM admin.admins
		ORDER BY id ASC
		LIMIT 1
		`,
	).Scan(&adminID)

	if err != nil {
		return 0
	}

	return adminID
}

// ============================================================
// SAVE CHAT MESSAGE
// ============================================================

func saveChatMessage(
	ctx context.Context,
	senderType string,
	senderID int64,
	receiverType string,
	receiverID int64,
	message string,
) (ChatMessage, error) {

	message = strings.TrimSpace(message)

	if message == "" {
		return ChatMessage{},
			fmt.Errorf("message is empty")
	}

	if len(message) > maxChatMessageLength {
		return ChatMessage{},
			fmt.Errorf("message is too long")
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
		return ChatMessage{},
			fmt.Errorf("save chat message failed: %w", err)
	}

	return result, nil
}

// ============================================================
// USER SESSION FROM REQUEST
// ============================================================

func getUserChatSession(
	r *http.Request,
) (Session, bool) {

	cookie, err := r.Cookie(
		userChatCookieName,
	)

	if err != nil ||
		cookie.Value == "" {

		return Session{}, false
	}

	session, ok := getSession(
		cookie.Value,
	)

	if !ok {
		return Session{}, false
	}

	return session, true
}

// ============================================================
// ADMIN SESSION FROM REQUEST
// ============================================================

func getAdminChatSession(
	r *http.Request,
) (AdminSession, bool) {

	cookie, err := r.Cookie(
		adminChatCookieName,
	)

	if err != nil ||
		cookie.Value == "" {

		return AdminSession{}, false
	}

	session, ok := getAdminSession(
		cookie.Value,
	)

	if !ok {
		return AdminSession{}, false
	}

	return session, true
}

// ============================================================
// USER CHAT MESSAGES
// ============================================================

func userChatMessagesHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	session, ok := getUserChatSession(r)

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

	switch r.Method {

	case http.MethodGet:

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
			LIMIT $2
			`,
			session.UserID,
			chatHistoryLimit,
		)

		if err != nil {

			log.Println(
				"User chat history error:",
				err,
			)

			http.Error(
				w,
				"Unable to load messages",
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

			err := rows.Scan(
				&message.ID,
				&message.SenderType,
				&message.SenderID,
				&message.ReceiverType,
				&message.ReceiverID,
				&message.Message,
				&message.IsRead,
				&message.CreatedAt,
			)

			if err != nil {

				log.Println(
					"User chat scan error:",
					err,
				)

				http.Error(
					w,
					"Unable to load messages",
					http.StatusInternalServerError,
				)

				return
			}

			messages = append(
				messages,
				message,
			)
		}

		if err := rows.Err(); err != nil {

			log.Println(
				"User chat rows error:",
				err,
			)

			http.Error(
				w,
				"Unable to load messages",
				http.StatusInternalServerError,
			)

			return
		}

		_, _ = db.Exec(
			ctx,
			`
			UPDATE public.chat_messages
			SET is_read = TRUE
			WHERE
				receiver_type = 'user'
				AND receiver_id = $1
				AND is_read = FALSE
			`,
			session.UserID,
		)

		w.Header().Set(
			"Content-Type",
			"application/json",
		)

		_ = json.NewEncoder(w).Encode(
			map[string]interface{}{
				"messages": messages,
			},
		)

		return

	case http.MethodPost:

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			8<<10,
		)

		var req UserChatSendRequest

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

		messageText := strings.TrimSpace(
			req.Message,
		)

		if messageText == "" {

			http.Error(
				w,
				"Message is required",
				http.StatusBadRequest,
			)

			return
		}

		if len(messageText) > maxChatMessageLength {

			http.Error(
				w,
				"Message is too long",
				http.StatusBadRequest,
			)

			return
		}

		adminID := getActiveAdminID(ctx)

		message, err := saveChatMessage(
			ctx,
			"user",
			session.UserID,
			"admin",
			adminID,
			messageText,
		)

		if err != nil {

			log.Println(
				"User chat send error:",
				err,
			)

			http.Error(
				w,
				"Unable to send message",
				http.StatusInternalServerError,
			)

			return
		}

		broadcastChatMessage(message)

		w.Header().Set(
			"Content-Type",
			"application/json",
		)

		_ = json.NewEncoder(w).Encode(
			map[string]interface{}{
				"message": message,
			},
		)

		return

	default:

		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}
}

// ============================================================
// ADMIN CHAT USERS
// ============================================================

func adminChatUsersHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	adminSession, ok := getAdminChatSession(r)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	_ = adminSession

	if r.Method != http.MethodGet {

		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	rows, err := adminDB.Query(
		ctx,
		`
		SELECT
			u.id,
			u.name,
			u.email,

			COALESCE(last_chat.message, '') AS last_message,

			last_chat.created_at AS last_message_at,

			(
				SELECT COUNT(*)
				FROM public.chat_messages cm2
				WHERE
					cm2.sender_type = 'user'
					AND cm2.sender_id = u.id
					AND cm2.receiver_type = 'admin'
					AND cm2.is_read = FALSE
			) AS unread_count

		FROM public.users u

		LEFT JOIN LATERAL
		(
			SELECT
				cm.message,
				cm.created_at

			FROM public.chat_messages cm

			WHERE
				(
					cm.sender_type = 'user'
					AND cm.sender_id = u.id
				)
				OR
				(
					cm.receiver_type = 'user'
					AND cm.receiver_id = u.id
				)

			ORDER BY cm.id DESC
			LIMIT 1

		) AS last_chat
		ON TRUE

		ORDER BY
			COALESCE(
				last_chat.created_at,
				TIMESTAMP '1970-01-01'
			) DESC,

			u.id DESC
		`,
	)

	if err != nil {

		log.Println(
			"Admin chat users error:",
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
		ID            int64      `json:"id"`
		Name          string     `json:"name"`
		Email         string     `json:"email"`
		LastMessage   string     `json:"last_message"`
		LastMessageAt *time.Time `json:"last_message_at"`
		UnreadCount   int64      `json:"unread_count"`
	}

	users := make(
		[]ChatUser,
		0,
	)

	for rows.Next() {

		var user ChatUser

		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.LastMessage,
			&user.LastMessageAt,
			&user.UnreadCount,
		)

		if err != nil {

			log.Println(
				"Admin chat user scan error:",
				err,
			)

			http.Error(
				w,
				"Unable to load chat users",
				http.StatusInternalServerError,
			)

			return
		}

		users = append(
			users,
			user,
		)
	}

	if err := rows.Err(); err != nil {

		log.Println(
			"Admin chat users rows error:",
			err,
		)

		http.Error(
			w,
			"Unable to load chat users",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	_ = json.NewEncoder(w).Encode(
		map[string]interface{}{
			"users": users,
		},
	)
}

// ============================================================
// ADMIN CHAT MESSAGES
// ============================================================

func adminChatMessagesHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	adminSession, ok := getAdminChatSession(r)

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

	switch r.Method {

	case http.MethodGet:

		userIDText := strings.TrimSpace(
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

		userID, err := strconv.ParseInt(
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

		var exists bool

		err = adminDB.QueryRow(
			ctx,
			`
			SELECT EXISTS(
				SELECT 1
				FROM public.users
				WHERE id = $1
			)
			`,
			userID,
		).Scan(&exists)

		if err != nil {

			log.Println(
				"Admin chat user check error:",
				err,
			)

			http.Error(
				w,
				"Unable to load chat",
				http.StatusInternalServerError,
			)

			return
		}

		if !exists {

			http.Error(
				w,
				"User not found",
				http.StatusNotFound,
			)

			return
		}

		rows, err := adminDB.Query(
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
			LIMIT $2
			`,
			userID,
			chatHistoryLimit,
		)

		if err != nil {

			log.Println(
				"Admin chat history error:",
				err,
			)

			http.Error(
				w,
				"Unable to load messages",
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

			err := rows.Scan(
				&message.ID,
				&message.SenderType,
				&message.SenderID,
				&message.ReceiverType,
				&message.ReceiverID,
				&message.Message,
				&message.IsRead,
				&message.CreatedAt,
			)

			if err != nil {

				log.Println(
					"Admin chat scan error:",
					err,
				)

				http.Error(
					w,
					"Unable to load messages",
					http.StatusInternalServerError,
				)

				return
			}

			messages = append(
				messages,
				message,
			)
		}

		if err := rows.Err(); err != nil {

			log.Println(
				"Admin chat rows error:",
				err,
			)

			http.Error(
				w,
				"Unable to load messages",
				http.StatusInternalServerError,
			)

			return
		}

		_, _ = adminDB.Exec(
			ctx,
			`
			UPDATE public.chat_messages
			SET is_read = TRUE
			WHERE
				sender_type = 'user'
				AND sender_id = $1
				AND receiver_type = 'admin'
				AND is_read = FALSE
			`,
			userID,
		)

		w.Header().Set(
			"Content-Type",
			"application/json",
		)

		_ = json.NewEncoder(w).Encode(
			map[string]interface{}{
				"messages": messages,
			},
		)

		return

	case http.MethodPost:

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			8<<10,
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

		if req.UserID <= 0 {

			http.Error(
				w,
				"Invalid User ID",
				http.StatusBadRequest,
			)

			return
		}

		messageText := strings.TrimSpace(
			req.Message,
		)

		if messageText == "" {

			http.Error(
				w,
				"Message is required",
				http.StatusBadRequest,
			)

			return
		}

		if len(messageText) > maxChatMessageLength {

			http.Error(
				w,
				"Message is too long",
				http.StatusBadRequest,
			)

			return
		}

		var exists bool

		err := adminDB.QueryRow(
			ctx,
			`
			SELECT EXISTS(
				SELECT 1
				FROM public.users
				WHERE id = $1
			)
			`,
			req.UserID,
		).Scan(&exists)

		if err != nil {

			log.Println(
				"Admin chat user validation error:",
				err,
			)

			http.Error(
				w,
				"Unable to send message",
				http.StatusInternalServerError,
			)

			return
		}

		if !exists {

			http.Error(
				w,
				"User not found",
				http.StatusNotFound,
			)

			return
		}

		message, err := saveChatMessage(
			ctx,
			"admin",
			adminSession.AdminID,
			"user",
			req.UserID,
			messageText,
		)

		if err != nil {

			log.Println(
				"Admin chat send error:",
				err,
			)

			http.Error(
				w,
				"Unable to send message",
				http.StatusInternalServerError,
			)

			return
		}

		broadcastChatMessage(message)

		w.Header().Set(
			"Content-Type",
			"application/json",
		)

		_ = json.NewEncoder(w).Encode(
			map[string]interface{}{
				"message": message,
			},
		)

		return

	default:

		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}
}

// ============================================================
// USER NOTIFICATIONS
// ============================================================

func userNotificationsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	session, ok := getUserChatSession(r)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

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

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	rows, err := db.Query(
		ctx,
		`
		SELECT
			id,
			type,
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
			"User notifications error:",
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

	type UserNotification struct {
		ID        int64     `json:"id"`
		Type      string    `json:"type"`
		Title     string    `json:"title"`
		Message   string    `json:"message"`
		IsRead    bool      `json:"is_read"`
		CreatedAt time.Time `json:"created_at"`
	}

	notifications := make(
		[]UserNotification,
		0,
	)

	for rows.Next() {

		var notification UserNotification

		err := rows.Scan(
			&notification.ID,
			&notification.Type,
			&notification.Title,
			&notification.Message,
			&notification.IsRead,
			&notification.CreatedAt,
		)

		if err != nil {

			log.Println(
				"Notification scan error:",
				err,
			)

			http.Error(
				w,
				"Unable to load notifications",
				http.StatusInternalServerError,
			)

			return
		}

		notifications = append(
			notifications,
			notification,
		)
	}

	if err := rows.Err(); err != nil {

		log.Println(
			"Notification rows error:",
			err,
		)

		http.Error(
			w,
			"Unable to load notifications",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	_ = json.NewEncoder(w).Encode(
		map[string]interface{}{
			"notifications": notifications,
		},
	)
}

// ============================================================
// MARK USER NOTIFICATIONS READ
// ============================================================

func markUserNotificationsReadHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	session, ok := getUserChatSession(r)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	if r.Method != http.MethodPost {

		http.Error(
			w,
			"Method not allowed",
			http.StatusMethodNotAllowed,
		)

		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var req struct {
		ID int64 `json:"id"`
	}

	if r.Body != nil {

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			4<<10,
		)

		err := json.NewDecoder(
			r.Body,
		).Decode(&req)

		if err != nil {

			// Empty body is allowed.
			req.ID = 0
		}
	}

	if req.ID > 0 {

		_, err := db.Exec(
			ctx,
			`
			UPDATE public.user_notifications
			SET is_read = TRUE
			WHERE
				id = $1
				AND user_id = $2
			`,
			req.ID,
			session.UserID,
		)

		if err != nil {

			log.Println(
				"Mark notification read error:",
				err,
			)

			http.Error(
				w,
				"Unable to update notification",
				http.StatusInternalServerError,
			)

			return
		}

	} else {

		_, err := db.Exec(
			ctx,
			`
			UPDATE public.user_notifications
			SET is_read = TRUE
			WHERE user_id = $1
			`,
			session.UserID,
		)

		if err != nil {

			log.Println(
				"Mark all notifications read error:",
				err,
			)

			http.Error(
				w,
				"Unable to update notifications",
				http.StatusInternalServerError,
			)

			return
		}
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	_ = json.NewEncoder(w).Encode(
		map[string]interface{}{
			"message": "Notifications marked as read",
		},
	)
}

// ============================================================
// CREATE USER NOTIFICATION
// ============================================================

func createUserNotification(
	ctx context.Context,
	userID int64,
	notificationType string,
	title string,
	message string,
) error {

	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	notificationType =
		strings.TrimSpace(notificationType)

	title =
		strings.TrimSpace(title)

	message =
		strings.TrimSpace(message)

	if notificationType == "" {
		notificationType = "general"
	}

	if title == "" {
		title = "Notification"
	}

	if message == "" {
		return fmt.Errorf("notification message is empty")
	}

	_, err := db.Exec(
		ctx,
		`
		INSERT INTO public.user_notifications
		(
			user_id,
			type,
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
		notificationType,
		title,
		message,
	)

	return err
}

// ============================================================
// CREATE COURSE APPLICATION AUTO REPLY
// ============================================================

func createCourseApplicationAutoReply(
	ctx context.Context,
	userID int64,
) {

	autoReply :=
		"Your course application has been received successfully.\n" +
			"Our team will review it and contact you soon."

	message, err := saveChatMessage(
		ctx,
		"system",
		0,
		"user",
		userID,
		autoReply,
	)

	if err != nil {

		log.Println(
			"Course application auto-reply error:",
			err,
		)

		return
	}

	broadcastChatMessage(message)

	err = createUserNotification(
		ctx,
		userID,
		"course_application",
		"Course Application Received",
		autoReply,
	)

	if err != nil {

		log.Println(
			"Course application notification error:",
			err,
		)
	}
}

// ============================================================
// USER WEBSOCKET
// ============================================================

func userChatWebSocketHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	session, ok := getUserChatSession(r)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	conn, err := chatUpgrader.Upgrade(
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
	}

	registerUserChatClient(
		session.UserID,
		client,
	)

	defer func() {

		unregisterUserChatClient(
			session.UserID,
			client,
		)

		_ = conn.Close()

	}()

	go client.pingLoop()

	conn.SetReadLimit(
		16 << 10,
	)

	_ = conn.SetReadDeadline(
		time.Now().Add(90 * time.Second),
	)

	conn.SetPongHandler(
		func(string) error {

			return conn.SetReadDeadline(
				time.Now().Add(90 * time.Second),
			)
		},
	)

	for {

		var payload struct {
			Type    string `json:"type"`
			Message string `json:"message"`
		}

		err := conn.ReadJSON(
			&payload,
		)

		if err != nil {

			return
		}

		if strings.TrimSpace(
			payload.Type,
		) != "message" {

			continue
		}

		messageText :=
			strings.TrimSpace(
				payload.Message,
			)

		if messageText == "" {
			continue
		}

		if len(messageText) >
			maxChatMessageLength {

			continue
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

		adminID :=
			getActiveAdminID(ctx)

		message, err := saveChatMessage(
			ctx,
			"user",
			session.UserID,
			"admin",
			adminID,
			messageText,
		)

		cancel()

		if err != nil {

			log.Println(
				"User websocket message save error:",
				err,
			)

			continue
		}

		broadcastChatMessage(message)
	}
}

// ============================================================
// ADMIN WEBSOCKET
// ============================================================

func adminChatWebSocketHandler(
	w http.ResponseWriter,
	r *http.Request,
) {

	session, ok := getAdminChatSession(r)

	if !ok {

		http.Error(
			w,
			"Unauthorized",
			http.StatusUnauthorized,
		)

		return
	}

	conn, err := chatUpgrader.Upgrade(
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
	}

	registerAdminChatClient(
		session.AdminID,
		client,
	)

	defer func() {

		unregisterAdminChatClient(
			session.AdminID,
			client,
		)

		_ = conn.Close()

	}()

	go client.pingLoop()

	conn.SetReadLimit(
		16 << 10,
	)

	_ = conn.SetReadDeadline(
		time.Now().Add(90 * time.Second),
	)

	conn.SetPongHandler(
		func(string) error {

			return conn.SetReadDeadline(
				time.Now().Add(90 * time.Second),
			)
		},
	)

	queryUserID := int64(0)

	queryUserIDText :=
		strings.TrimSpace(
			r.URL.Query().Get("user_id"),
		)

	if queryUserIDText != "" {

		if parsed, err := strconv.ParseInt(
			queryUserIDText,
			10,
			64,
		); err == nil && parsed > 0 {

			queryUserID = parsed
		}
	}

	for {

		var payload struct {
			Type    string `json:"type"`
			Message string `json:"message"`
			UserID  int64  `json:"user_id"`
		}

		err := conn.ReadJSON(
			&payload,
		)

		if err != nil {
			return
		}

		if strings.TrimSpace(
			payload.Type,
		) != "message" {

			continue
		}

		userID := payload.UserID

		if userID <= 0 {
			userID = queryUserID
		}

		if userID <= 0 {
			continue
		}

		messageText :=
			strings.TrimSpace(
				payload.Message,
			)

		if messageText == "" {
			continue
		}

		if len(messageText) >
			maxChatMessageLength {

			continue
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			5*time.Second,
		)

		message, err := saveChatMessage(
			ctx,
			"admin",
			session.AdminID,
			"user",
			userID,
			messageText,
		)

		cancel()

		if err != nil {

			log.Println(
				"Admin websocket message save error:",
				err,
			)

			continue
		}

		broadcastChatMessage(message)
	}
}
