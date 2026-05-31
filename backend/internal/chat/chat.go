package chat

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Hub manages all active WebSocket connections grouped by room
type Hub struct {
	mu      sync.RWMutex
	rooms   map[string]map[*Client]bool
}

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	roomID   string
	userID   string
	userName string
}

var globalHub = &Hub{rooms: make(map[string]map[*Client]bool)}

func HandleWebSocket(c *gin.Context) {
	roomID := c.Query("room")
	if roomID == "" {
		roomID = "general"
	}
	userID := c.GetString("user_id")
	userName := c.GetString("name")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WS upgrade error:", err)
		return
	}

	client := &Client{
		hub:      globalHub,
		conn:     conn,
		send:     make(chan []byte, 256),
		roomID:   roomID,
		userID:   userID,
		userName: userName,
	}

	globalHub.register(client)
	defer globalHub.unregister(client)

	// Send last 50 messages on connect
	history := getHistory(roomID)
	for _, msg := range history {
		data, _ := json.Marshal(msg)
		client.conn.WriteMessage(websocket.TextMessage, data)
	}

	// Announce join
	globalHub.broadcast(roomID, models.WSMessage{
		Type:     "join",
		RoomID:   roomID,
		Sender:   userName,
		SenderID: userID,
		Timestamp: time.Now(),
	})

	go client.writePump()
	client.readPump()
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.roomID] == nil {
		h.rooms[c.roomID] = make(map[*Client]bool)
	}
	h.rooms[c.roomID][c] = true
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[c.roomID]; ok {
		delete(room, c)
		c.conn.Close()
	}
	h.broadcast(c.roomID, models.WSMessage{
		Type:     "leave",
		RoomID:   c.roomID,
		Sender:   c.userName,
		SenderID: c.userID,
		Timestamp: time.Now(),
	})
}

func (h *Hub) broadcast(roomID string, msg models.WSMessage) {
	data, _ := json.Marshal(msg)
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.rooms[roomID] {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.rooms[roomID], client)
		}
	}
}

func (c *Client) readPump() {
	defer func() { c.conn.Close() }()
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, msgBytes, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var incoming models.WSMessage
		if err := json.Unmarshal(msgBytes, &incoming); err != nil {
			continue
		}
		incoming.Sender = c.userName
		incoming.SenderID = c.userID
		incoming.RoomID = c.roomID
		incoming.Timestamp = time.Now()
		incoming.Type = "message"

		// Persist to MongoDB
		saveMessage(incoming)

		// Broadcast to room
		c.hub.broadcast(c.roomID, incoming)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() { ticker.Stop(); c.conn.Close() }()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func saveMessage(msg models.WSMessage) {
	senderOID, _ := primitive.ObjectIDFromHex(msg.SenderID)
	m := models.Message{
		ID:         primitive.NewObjectID(),
		RoomID:     msg.RoomID,
		SenderID:   senderOID,
		SenderName: msg.Sender,
		Content:    msg.Content,
		Type:       "text",
		CreatedAt:  msg.Timestamp,
	}
	col := db.GetCollection("messages")
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	col.InsertOne(ctx, m)
}

func getHistory(roomID string) []models.WSMessage {
	col := db.GetCollection("messages")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(50)
	cursor, err := col.Find(ctx, bson.M{"room_id": roomID}, opts)
	if err != nil {
		return nil
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	cursor.All(ctx, &messages)

	// Reverse so oldest first
	var result []models.WSMessage
	for i := len(messages) - 1; i >= 0; i-- {
		m := messages[i]
		result = append(result, models.WSMessage{
			Type:      "message",
			RoomID:    m.RoomID,
			Content:   m.Content,
			Sender:    m.SenderName,
			SenderID:  m.SenderID.Hex(),
			Timestamp: m.CreatedAt,
		})
	}
	return result
}
