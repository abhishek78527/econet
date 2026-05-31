package address

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/addresses")
	g.GET("", GetAddresses)
	g.POST("", AddAddress)
	g.PUT("/:id", UpdateAddress)
	g.DELETE("/:id", DeleteAddress)
	g.PUT("/:id/default", SetDefault)
}

func GetAddresses(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	cursor, _ := db.GetCollection("addresses").Find(ctx, bson.M{"user_id": userID})
	var addrs []models.Address
	cursor.All(ctx, &addrs)
	if addrs == nil { addrs = []models.Address{} }
	c.JSON(http.StatusOK, gin.H{"addresses": addrs})
}

func AddAddress(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body models.Address
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	body.ID = primitive.NewObjectID()
	body.UserID = userID
	body.CreatedAt = time.Now()

	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)

	// If first address or set as default, unset others
	if body.IsDefault {
		db.GetCollection("addresses").UpdateMany(ctx, bson.M{"user_id": userID}, bson.M{"$set": bson.M{"is_default": false}})
	}

	// Check if this is the first address — make it default
	count, _ := db.GetCollection("addresses").CountDocuments(ctx, bson.M{"user_id": userID})
	if count == 0 { body.IsDefault = true }

	db.GetCollection("addresses").InsertOne(ctx, body)
	c.JSON(http.StatusCreated, gin.H{"address": body})
}

func UpdateAddress(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	delete(body, "_id"); delete(body, "user_id")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	db.GetCollection("addresses").UpdateOne(ctx, bson.M{"_id": id, "user_id": userID}, bson.M{"$set": body})
	c.JSON(http.StatusOK, gin.H{"message": "Address updated"})
}

func DeleteAddress(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	db.GetCollection("addresses").DeleteOne(ctx, bson.M{"_id": id, "user_id": userID})
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func SetDefault(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	db.GetCollection("addresses").UpdateMany(ctx, bson.M{"user_id": userID}, bson.M{"$set": bson.M{"is_default": false}})
	db.GetCollection("addresses").UpdateOne(ctx, bson.M{"_id": id, "user_id": userID}, bson.M{"$set": bson.M{"is_default": true}})
	c.JSON(http.StatusOK, gin.H{"message": "Default address set"})
}
