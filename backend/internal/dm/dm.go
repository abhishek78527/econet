package dm

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/dm")
	g.POST("/send", SendMessage)
	g.GET("/conversations", GetConversations)
	g.GET("/:userID", GetMessages)
	g.PUT("/:userID/read", MarkRead)
}

// POST /api/v1/dm/send
func SendMessage(c *gin.Context) {
	myID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	myName := c.GetString("name")

	var body struct {
		ToID    string `json:"to_id" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	toID, err := primitive.ObjectIDFromHex(body.ToID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recipient ID"})
		return
	}

	// Get sender's avatar
	usersCol := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var sender models.User
	usersCol.FindOne(ctx, bson.M{"_id": myID}).Decode(&sender)

	msg := models.DirectMessage{
		ID:         primitive.NewObjectID(),
		FromID:     myID,
		ToID:       toID,
		FromName:   myName,
		FromAvatar: sender.Avatar,
		Content:    body.Content,
		Read:       false,
		CreatedAt:  time.Now(),
	}

	col := db.GetCollection("direct_messages")
	if _, err := col.InsertOne(ctx, msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not send message"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": msg})
}

// GET /api/v1/dm/conversations
func GetConversations(c *gin.Context) {
	myID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("direct_messages")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find all messages involving me
	cursor, err := col.Find(ctx, bson.M{"$or": bson.A{
		bson.M{"from_id": myID}, bson.M{"to_id": myID},
	}}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	// Build conversation map
	convMap := map[primitive.ObjectID]*models.Conversation{}
	for cursor.Next(ctx) {
		var msg models.DirectMessage
		if err := cursor.Decode(&msg); err != nil { continue }

		// The other person
		otherID := msg.ToID
		otherName := ""
		otherAvatar := ""
		if msg.FromID == myID {
			otherID = msg.ToID
		} else {
			otherID = msg.FromID
			otherName = msg.FromName
			otherAvatar = msg.FromAvatar
		}

		if _, exists := convMap[otherID]; !exists {
			// Fetch other user info
			usersCol := db.GetCollection("users")
			var other models.User
			if err := usersCol.FindOne(ctx, bson.M{"_id": otherID}).Decode(&other); err == nil {
				otherName = other.Name
				otherAvatar = other.Avatar
			}
			convMap[otherID] = &models.Conversation{
				UserID:   otherID,
				Username: func() string { if other.Username != "" { return other.Username }; return "" }(),
				Name:     otherName,
				Avatar:   otherAvatar,
				LastMsg:  msg.Content,
				LastTime: msg.CreatedAt,
			}
		}
		// Count unread
		if msg.ToID == myID && !msg.Read {
			convMap[otherID].UnreadCount++
		}
	}

	var convs []models.Conversation
	for _, v := range convMap { convs = append(convs, *v) }
	if convs == nil { convs = []models.Conversation{} }
	c.JSON(http.StatusOK, gin.H{"conversations": convs})
}

// GET /api/v1/dm/:userID  — messages between me and userID
func GetMessages(c *gin.Context) {
	myID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	otherID, err := primitive.ObjectIDFromHex(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	col := db.GetCollection("direct_messages")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"$or": bson.A{
		bson.M{"from_id": myID, "to_id": otherID},
		bson.M{"from_id": otherID, "to_id": myID},
	}}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}).SetLimit(100)
	cursor, err := col.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)
	var msgs []models.DirectMessage
	cursor.All(ctx, &msgs)
	if msgs == nil { msgs = []models.DirectMessage{} }
	c.JSON(http.StatusOK, gin.H{"messages": msgs})
}

// PUT /api/v1/dm/:userID/read
func MarkRead(c *gin.Context) {
	myID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	fromID, err := primitive.ObjectIDFromHex(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	col := db.GetCollection("direct_messages")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	col.UpdateMany(ctx, bson.M{"from_id": fromID, "to_id": myID, "read": false}, bson.M{"$set": bson.M{"read": true}})
	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}
