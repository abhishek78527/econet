package users

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/users")
	g.GET("/me", GetMe)
	g.PUT("/me", UpdateMe)
	g.GET("/search", SearchUsers)
	g.GET("/:id", GetUser)
	g.POST("/:id/follow", FollowUser)
	g.GET("", ListUsers)
}

func GetMe(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var user models.User
	if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toPublic(user)})
}

func UpdateMe(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		Name       string `json:"name"`
		Bio        string `json:"bio"`
		Company    string `json:"company"`
		Avatar     string `json:"avatar"`
		CoverImage string `json:"cover_image"`
		Role       string `json:"role"`
		Location   string `json:"location"`
		Pronouns   string `json:"pronouns"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"name": body.Name, "bio": body.Bio, "company": body.Company,
		"avatar": body.Avatar, "cover_image": body.CoverImage,
		"role": body.Role, "location": body.Location, "pronouns": body.Pronouns,
		"updated_at": time.Now(),
	}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}
	var updated models.User
	col.FindOne(ctx, bson.M{"_id": oid}).Decode(&updated)
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated", "user": toPublic(updated)})
}

// GET /api/v1/users/search?q=arjun
func SearchUsers(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query required"})
		return
	}
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"$or": bson.A{
		bson.M{"name":     bson.M{"$regex": q, "$options": "i"}},
		bson.M{"username": bson.M{"$regex": q, "$options": "i"}},
		bson.M{"email":    bson.M{"$regex": q, "$options": "i"}},
		bson.M{"company":  bson.M{"$regex": q, "$options": "i"}},
	}}
	opts := options.Find().SetLimit(20)
	cursor, err := col.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	defer cursor.Close(ctx)
	var users []models.UserPublic
	for cursor.Next(ctx) {
		var u models.User
		if err := cursor.Decode(&u); err == nil {
			users = append(users, toPublic(u))
		}
	}
	if users == nil { users = []models.UserPublic{} }
	c.JSON(http.StatusOK, gin.H{"users": users, "count": len(users)})
}

// GET /api/v1/users/:id  (supports both MongoDB ID and @username)
func GetUser(c *gin.Context) {
	id := c.Param("id")
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	// Try username first (if starts with @ or not a valid ObjectID)
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		// Search by username
		username := id
		if len(username) > 0 && username[0] == '@' {
			username = username[1:]
		}
		if err := col.FindOne(ctx, bson.M{"username": username}).Decode(&user); err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
	} else {
		if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&user); err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"user": toPublic(user)})
}

// POST /api/v1/users/:id/follow  (toggle)
func FollowUser(c *gin.Context) {
	targetID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	myID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	if myID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot follow yourself"})
		return
	}

	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if already following
	var me models.User
	col.FindOne(ctx, bson.M{"_id": myID}).Decode(&me)
	following := false
	for _, f := range me.Following {
		if f == targetID { following = true; break }
	}

	if following {
		col.UpdateOne(ctx, bson.M{"_id": myID}, bson.M{"$pull": bson.M{"following": targetID}})
		col.UpdateOne(ctx, bson.M{"_id": targetID}, bson.M{"$pull": bson.M{"followers": myID}})
		c.JSON(http.StatusOK, gin.H{"action": "unfollowed"})
	} else {
		col.UpdateOne(ctx, bson.M{"_id": myID}, bson.M{"$addToSet": bson.M{"following": targetID}})
		col.UpdateOne(ctx, bson.M{"_id": targetID}, bson.M{"$addToSet": bson.M{"followers": myID}})
		c.JSON(http.StatusOK, gin.H{"action": "followed"})
	}
}

func ListUsers(c *gin.Context) {
	filter := bson.M{}
	if role := c.Query("role"); role != "" { filter["role"] = role }
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := col.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)
	var users []models.UserPublic
	for cursor.Next(ctx) {
		var u models.User
		if err := cursor.Decode(&u); err == nil { users = append(users, toPublic(u)) }
	}
	if users == nil { users = []models.UserPublic{} }
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func toPublic(u models.User) models.UserPublic {
	return models.UserPublic{
		ID: u.ID, Username: u.Username, Name: u.Name, Email: u.Email,
		Avatar: u.Avatar, CoverImage: u.CoverImage, Bio: u.Bio,
		Company: u.Company, Location: u.Location, Role: u.Role,
		FollowerCount: len(u.Followers), FollowingCount: len(u.Following),
	}
}
