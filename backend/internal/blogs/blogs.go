package blogs

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
	g := rg.Group("/blogs")
	g.GET("", ListBlogs)
	g.POST("", CreateBlog)
	g.GET("/:id", GetBlog)
	g.PUT("/:id", UpdateBlog)
	g.DELETE("/:id", DeleteBlog)
}

func ListBlogs(c *gin.Context) {
	filter := bson.M{"published": true}
	if c.Query("all") == "true" {
		// Author can see their own drafts
		userID := c.GetString("user_id")
		oid, _ := primitive.ObjectIDFromHex(userID)
		filter = bson.M{"author_id": oid}
	}

	col := db.GetCollection("blogs")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(50)
	cursor, err := col.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var blogs []models.Blog
	if err := cursor.All(ctx, &blogs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Decode error"})
		return
	}

	// Enrich with author info
	userCol := db.GetCollection("users")
	for i := range blogs {
		var author models.User
		if err := userCol.FindOne(ctx, bson.M{"_id": blogs[i].AuthorID}).Decode(&author); err == nil {
			pub := models.UserPublic{ID: author.ID, Name: author.Name, Avatar: author.Avatar}
			blogs[i].Author = &pub
		}
	}
	if blogs == nil {
		blogs = []models.Blog{}
	}
	c.JSON(http.StatusOK, gin.H{"blogs": blogs})
}

func CreateBlog(c *gin.Context) {
	var req models.CreateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	oid, _ := primitive.ObjectIDFromHex(userID)

	blog := models.Blog{
		ID:         primitive.NewObjectID(),
		AuthorID:   oid,
		Title:      req.Title,
		Summary:    req.Summary,
		Content:    req.Content,
		CoverImage: req.CoverImage,
		Tags:       req.Tags,
		Published:  req.Published,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	col := db.GetCollection("blogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := col.InsertOne(ctx, blog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create blog"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"blog": blog})
}

func GetBlog(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	col := db.GetCollection("blogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var blog models.Blog
	if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&blog); err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"blog": blog})
}

func UpdateBlog(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	userID := c.GetString("user_id")
	authorOID, _ := primitive.ObjectIDFromHex(userID)

	var req models.CreateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := db.GetCollection("blogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := col.UpdateOne(ctx,
		bson.M{"_id": oid, "author_id": authorOID},
		bson.M{"$set": bson.M{
			"title": req.Title, "summary": req.Summary, "content": req.Content,
			"tags": req.Tags, "published": req.Published, "updated_at": time.Now(),
		}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not found or unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Blog updated"})
}

func DeleteBlog(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	userID := c.GetString("user_id")
	authorOID, _ := primitive.ObjectIDFromHex(userID)

	col := db.GetCollection("blogs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := col.DeleteOne(ctx, bson.M{"_id": oid, "author_id": authorOID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not found or unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Blog deleted"})
}
