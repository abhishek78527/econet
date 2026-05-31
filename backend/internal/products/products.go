package products

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/products")
	g.GET("", ListProducts)
	g.GET("/trending", TrendingProducts)
	g.GET("/search", SearchProducts)
	g.GET("/:id", GetProduct)
	g.POST("", CreateProduct)
	g.PUT("/:id", UpdateProduct)
	g.DELETE("/:id", DeleteProduct)
	g.POST("/:id/review", AddReview)
	g.GET("/:id/reviews", GetReviews)
	g.POST("/:id/wishlist", ToggleWishlist)
}

func ListProducts(c *gin.Context) {
	filter := bson.M{"active": true}
	if cat := c.Query("category"); cat != "" { filter["category"] = cat }
	if store := c.Query("store_id"); store != "" {
		if oid, err := primitive.ObjectIDFromHex(store); err == nil { filter["store_id"] = oid }
	}
	if seller := c.Query("seller_id"); seller != "" {
		if oid, err := primitive.ObjectIDFromHex(seller); err == nil { filter["seller_id"] = oid }
	}
	// Price range
	minP := c.Query("min_price"); maxP := c.Query("max_price")
	if minP != "" || maxP != "" {
		priceFilter := bson.M{}
		if minP != "" { var v float64; fmt.Sscanf(minP, "%f", &v); priceFilter["$gte"] = v }
		if maxP != "" { var v float64; fmt.Sscanf(maxP, "%f", &v); priceFilter["$lte"] = v }
		filter["price"] = priceFilter
	}

	sortField := "created_at"; sortDir := -1
	switch c.Query("sort") {
	case "price_asc":  sortField = "price";       sortDir = 1
	case "price_desc": sortField = "price";       sortDir = -1
	case "rating":     sortField = "avg_rating";  sortDir = -1
	case "popular":    sortField = "sold_count";  sortDir = -1
	}

	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: sortField, Value: sortDir}}).SetLimit(60)
	cursor, _ := col.Find(ctx, filter, opts)
	var prods []models.Product
	cursor.All(ctx, &prods)
	if prods == nil { prods = []models.Product{} }
	c.JSON(http.StatusOK, gin.H{"products": prods, "count": len(prods)})
}

func TrendingProducts(c *gin.Context) {
	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "sold_count", Value: -1}}).SetLimit(12)
	cursor, _ := col.Find(ctx, bson.M{"active": true}, opts)
	var prods []models.Product
	cursor.All(ctx, &prods)
	if prods == nil { prods = []models.Product{} }
	c.JSON(http.StatusOK, gin.H{"products": prods})
}

func SearchProducts(c *gin.Context) {
	q := c.Query("q")
	if q == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "Query required"}); return }
	filter := bson.M{
		"active": true,
		"$or": bson.A{
			bson.M{"name":        bson.M{"$regex": q, "$options": "i"}},
			bson.M{"description": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"category":    bson.M{"$regex": q, "$options": "i"}},
			bson.M{"brand":       bson.M{"$regex": q, "$options": "i"}},
			bson.M{"tags":        bson.M{"$in": []string{strings.ToLower(q)}}},
		},
	}
	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	opts := options.Find().SetLimit(40)
	cursor, _ := col.Find(ctx, filter, opts)
	var prods []models.Product
	cursor.All(ctx, &prods)
	if prods == nil { prods = []models.Product{} }
	c.JSON(http.StatusOK, gin.H{"products": prods, "count": len(prods)})
}

func GetProduct(c *gin.Context) {
	oid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"}); return }
	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var p models.Product
	if err := col.FindOne(ctx, bson.M{"_id": oid}).Decode(&p); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"}); return
	}
	// Related products (same category)
	relOpts := options.Find().SetLimit(6)
	relCursor, _ := col.Find(ctx, bson.M{"category": p.Category, "_id": bson.M{"$ne": oid}, "active": true}, relOpts)
	var related []models.Product
	relCursor.All(ctx, &related)
	// Seller store info
	var store models.Store
	storeCol := db.GetCollection("stores")
	storeCol.FindOne(ctx, bson.M{"owner_id": p.SellerID}).Decode(&store)
	c.JSON(http.StatusOK, gin.H{"product": p, "related": related, "store": store})
}

func CreateProduct(c *gin.Context) {
	sellerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		StoreID     string            `json:"store_id"`
		Name        string            `json:"name" binding:"required"`
		Description string            `json:"description"`
		Category    string            `json:"category" binding:"required"`
		Brand       string            `json:"brand"`
		Images      []string          `json:"images"`
		Price       float64           `json:"price" binding:"required"`
		Discount    float64           `json:"discount"`
		Stock       int               `json:"stock"`
		Specs       map[string]string `json:"specs"`
		Tags        []string          `json:"tags"`
		Shipping    string            `json:"shipping"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	storeOID, _ := primitive.ObjectIDFromHex(body.StoreID)
	// Get store name
	storeCol := db.GetCollection("stores")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var store models.Store
	storeCol.FindOne(ctx, bson.M{"_id": storeOID}).Decode(&store)

	slug := fmt.Sprintf("%s-%d", strings.ToLower(strings.ReplaceAll(body.Name, " ", "-")), rand.Intn(9999))
	p := models.Product{
		ID: primitive.NewObjectID(), SellerID: sellerID, StoreID: storeOID,
		StoreName: store.Name, Name: body.Name, Slug: slug,
		Description: body.Description, Category: body.Category,
		Brand: body.Brand, Images: body.Images, Price: body.Price,
		Discount: body.Discount, Stock: body.Stock,
		Specs: body.Specs, Tags: body.Tags, Shipping: body.Shipping,
		Active: true, SKU: fmt.Sprintf("SKU-%d", rand.Intn(999999)),
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	col := db.GetCollection("products")
	col.InsertOne(ctx, p)
	c.JSON(http.StatusCreated, gin.H{"product": p})
}

func UpdateProduct(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	sellerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	body["updated_at"] = time.Now()
	delete(body, "_id"); delete(body, "seller_id")
	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	result, _ := col.UpdateOne(ctx, bson.M{"_id": oid, "seller_id": sellerID}, bson.M{"$set": body})
	if result.MatchedCount == 0 { c.JSON(http.StatusForbidden, gin.H{"error": "Not found or unauthorized"}); return }
	c.JSON(http.StatusOK, gin.H{"message": "Product updated"})
}

func DeleteProduct(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	sellerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	col.UpdateOne(ctx, bson.M{"_id": oid, "seller_id": sellerID}, bson.M{"$set": bson.M{"active": false}})
	c.JSON(http.StatusOK, gin.H{"message": "Product removed"})
}

func AddReview(c *gin.Context) {
	productID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	userName := c.GetString("name")
	var body struct {
		Rating int    `json:"rating" binding:"required,min=1,max=5"`
		Title  string `json:"title"`
		Body   string `json:"body"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	// Get user avatar
	usersCol := db.GetCollection("users")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var user models.User
	usersCol.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)

	review := models.Review{
		ID: primitive.NewObjectID(), ProductID: productID, UserID: userID,
		UserName: userName, UserAvatar: user.Avatar,
		Rating: body.Rating, Title: body.Title, Body: body.Body,
		Verified: true, CreatedAt: time.Now(),
	}
	col := db.GetCollection("reviews")
	col.InsertOne(ctx, review)
	// Update product avg rating
	cursor, _ := col.Find(ctx, bson.M{"product_id": productID})
	var reviews []models.Review
	cursor.All(ctx, &reviews)
	total := 0
	for _, r := range reviews { total += r.Rating }
	avg := float64(total) / float64(len(reviews))
	prodCol := db.GetCollection("products")
	prodCol.UpdateOne(ctx, bson.M{"_id": productID}, bson.M{"$set": bson.M{"avg_rating": avg, "review_count": len(reviews)}})
	c.JSON(http.StatusCreated, gin.H{"review": review})
}

func GetReviews(c *gin.Context) {
	productID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	col := db.GetCollection("reviews")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(20)
	cursor, _ := col.Find(ctx, bson.M{"product_id": productID}, opts)
	var reviews []models.Review
	cursor.All(ctx, &reviews)
	if reviews == nil { reviews = []models.Review{} }
	c.JSON(http.StatusOK, gin.H{"reviews": reviews})
}

func ToggleWishlist(c *gin.Context) {
	productID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("wishlists")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var wl models.Wishlist
	col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&wl)
	inList := false
	for _, p := range wl.Products { if p == productID { inList = true; break } }
	if inList {
		col.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{"$pull": bson.M{"products": productID}})
		c.JSON(http.StatusOK, gin.H{"action": "removed"})
	} else {
		col.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{"$addToSet": bson.M{"products": productID}, "$setOnInsert": bson.M{"user_id": userID}}, options.Update().SetUpsert(true))
		c.JSON(http.StatusOK, gin.H{"action": "added"})
	}
}
