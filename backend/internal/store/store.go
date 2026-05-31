package store

import (
	"context"
	"net/http"
	"strings"
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
	g := rg.Group("/stores")
	g.POST("", CreateStore)
	g.GET("", ListStores)
	g.GET("/me", GetMyStore)
	g.GET("/:id", GetStore)
	g.PUT("/:id", UpdateStore)
	g.POST("/:id/follow", FollowStore)
}

func slugify(s string) string {
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(s), " ", "-"))
}

func CreateStore(c *gin.Context) {
	ownerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Category    string `json:"category"`
		Location    string `json:"location"`
		Phone       string `json:"phone"`
		Email       string `json:"email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	// Check if store already exists
	var existing models.Store
	if col.FindOne(ctx, bson.M{"owner_id": ownerID}).Decode(&existing) == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You already have a store"}); return
	}
	s := models.Store{
		ID: primitive.NewObjectID(), OwnerID: ownerID,
		Name: body.Name, Slug: slugify(body.Name),
		Description: body.Description, Category: body.Category,
		Location: body.Location, Phone: body.Phone, Email: body.Email,
		Followers: []primitive.ObjectID{}, CreatedAt: time.Now(),
	}
	col.InsertOne(ctx, s)
	c.JSON(http.StatusCreated, gin.H{"store": s})
}

func GetMyStore(c *gin.Context) {
	ownerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var s models.Store
	if err := col.FindOne(ctx, bson.M{"owner_id": ownerID}).Decode(&s); err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "No store yet"}); return
	}
	c.JSON(http.StatusOK, gin.H{"store": s})
}

func GetStore(c *gin.Context) {
	id := c.Param("id")
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var s models.Store
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		col.FindOne(ctx, bson.M{"_id": oid}).Decode(&s)
	} else {
		col.FindOne(ctx, bson.M{"slug": id}).Decode(&s)
	}
	if s.ID.IsZero() { c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"}); return }
	// Attach product stats
	prodCol := db.GetCollection("products")
	count, _ := prodCol.CountDocuments(ctx, bson.M{"store_id": s.ID, "active": true})
	c.JSON(http.StatusOK, gin.H{"store": s, "product_count": count})
}

func ListStores(c *gin.Context) {
	filter := bson.M{}
	if cat := c.Query("category"); cat != "" { filter["category"] = cat }
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "total_sales", Value: -1}}).SetLimit(50)
	cursor, _ := col.Find(ctx, filter, opts)
	var stores []models.Store
	cursor.All(ctx, &stores)
	if stores == nil { stores = []models.Store{} }
	c.JSON(http.StatusOK, gin.H{"stores": stores})
}

func UpdateStore(c *gin.Context) {
	ownerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	body["updated_at"] = time.Now()
	delete(body, "_id"); delete(body, "owner_id")
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	col.UpdateOne(ctx, bson.M{"owner_id": ownerID}, bson.M{"$set": body})
	c.JSON(http.StatusOK, gin.H{"message": "Store updated"})
}

func FollowStore(c *gin.Context) {
	storeID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var s models.Store
	col.FindOne(ctx, bson.M{"_id": storeID}).Decode(&s)
	following := false
	for _, f := range s.Followers { if f == userID { following = true; break } }
	if following {
		col.UpdateOne(ctx, bson.M{"_id": storeID}, bson.M{"$pull": bson.M{"followers": userID}})
		c.JSON(http.StatusOK, gin.H{"action": "unfollowed"})
	} else {
		col.UpdateOne(ctx, bson.M{"_id": storeID}, bson.M{"$addToSet": bson.M{"followers": userID}})
		c.JSON(http.StatusOK, gin.H{"action": "followed"})
	}
}
