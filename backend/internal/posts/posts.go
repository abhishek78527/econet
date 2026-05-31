package posts

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
	g := rg.Group("/posts")
	g.GET("", ListPosts)
	g.POST("", CreatePost)
	g.GET("/:id", GetPost)
	g.PUT("/:id", UpdatePost)
	g.DELETE("/:id", DeletePost)
	g.POST("/:id/like", ToggleLike)
}

// GET /api/v1/posts
func ListPosts(c *gin.Context) {
	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(50)
	cursor, err := col.Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err := cursor.All(ctx, &posts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Decode error"})
		return
	}

	// Enrich with author info
	userCol := db.GetCollection("users")
	for i := range posts {
		posts[i].LikeCount = len(posts[i].Likes)
		var author models.User
		if err := userCol.FindOne(ctx, bson.M{"_id": posts[i].AuthorID}).Decode(&author); err == nil {
			pub := models.UserPublic{ID: author.ID, Name: author.Name, Avatar: author.Avatar, Role: author.Role}
			posts[i].Author = &pub
		}
	}
	if posts == nil {
		posts = []models.Post{}
	}
	c.JSON(http.StatusOK, gin.H{"posts": posts})
}

// POST /api/v1/posts
func CreatePost(c *gin.Context) {
	var req models.CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	oid, _ := primitive.ObjectIDFromHex(userID)

	post := models.Post{
		ID:        primitive.NewObjectID(),
		AuthorID:  oid,
		Content:   req.Content,
		ImageURL:  req.ImageURL,
		Tags:      req.Tags,
		Likes:     []primitive.ObjectID{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := col.InsertOne(ctx, post); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create post"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"post": post})
}

// GET /api/v1/posts/:id
func GetPost(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var post models.Post
	if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&post); err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}
	post.LikeCount = len(post.Likes)
	c.JSON(http.StatusOK, gin.H{"post": post})
}

// PUT /api/v1/posts/:id
func UpdatePost(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	userID := c.GetString("user_id")
	authorOID, _ := primitive.ObjectIDFromHex(userID)

	var req models.CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := col.UpdateOne(ctx,
		bson.M{"_id": oid, "author_id": authorOID},
		bson.M{"$set": bson.M{"content": req.Content, "image_url": req.ImageURL, "tags": req.Tags, "updated_at": time.Now()}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not found or unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Post updated"})
}

// DELETE /api/v1/posts/:id
func DeletePost(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	userID := c.GetString("user_id")
	authorOID, _ := primitive.ObjectIDFromHex(userID)

	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := col.DeleteOne(ctx, bson.M{"_id": oid, "author_id": authorOID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not found or unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Post deleted"})
}

// POST /api/v1/posts/:id/like  (toggle)
func ToggleLike(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	userID := c.GetString("user_id")
	userOID, _ := primitive.ObjectIDFromHex(userID)

	col := db.GetCollection("posts")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var post models.Post
	if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&post); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	liked := false
	for _, l := range post.Likes {
		if l == userOID {
			liked = true
			break
		}
	}

	var update bson.M
	if liked {
		update = bson.M{"$pull": bson.M{"likes": userOID}}
	} else {
		update = bson.M{"$addToSet": bson.M{"likes": userOID}}
	}
	col.UpdateOne(ctx, bson.M{"_id": oid}, update)

	action := "liked"
	if liked {
		action = "unliked"
	}
	c.JSON(http.StatusOK, gin.H{"action": action})
}
