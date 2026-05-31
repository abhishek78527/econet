package cart

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
	g := rg.Group("/cart")
	g.GET("", GetCart)
	g.POST("/add", AddToCart)
	g.PUT("/qty", UpdateQty)
	g.DELETE("/:productId", RemoveItem)
	g.DELETE("", ClearCart)
	g.GET("/wishlist", GetWishlist)
}

func GetCart(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("carts")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var cart models.Cart
	col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&cart)
	// Enrich with product details
	prodCol := db.GetCollection("products")
	for i, item := range cart.Items {
		var p models.Product
		if prodCol.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&p) == nil {
			cart.Items[i].Product = &p
		}
	}
	total := 0.0
	for _, item := range cart.Items {
		if item.Product != nil { total += item.Product.DiscountedPrice() * float64(item.Qty) }
	}
	c.JSON(http.StatusOK, gin.H{"cart": cart, "total": total, "count": len(cart.Items)})
}

func AddToCart(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		ProductID string `json:"product_id" binding:"required"`
		Qty       int    `json:"qty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
	if body.Qty <= 0 { body.Qty = 1 }
	pOID, _ := primitive.ObjectIDFromHex(body.ProductID)
	prodCol := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var p models.Product
	if err := prodCol.FindOne(ctx, bson.M{"_id": pOID}).Decode(&p); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"}); return
	}
	col := db.GetCollection("carts")
	// Check if already in cart → increment qty
	var existing models.Cart
	col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existing)
	found := false
	for _, item := range existing.Items { if item.ProductID == pOID { found = true; break } }
	if found {
		col.UpdateOne(ctx, bson.M{"user_id": userID, "items.product_id": pOID}, bson.M{"$inc": bson.M{"items.$.qty": body.Qty}})
	} else {
		col.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{
			"$push": bson.M{"items": models.CartItem{ProductID: pOID, Qty: body.Qty, Price: p.DiscountedPrice()}},
			"$set":  bson.M{"updated_at": time.Now()},
		}, options.Update().SetUpsert(true))
	}
	c.JSON(http.StatusOK, gin.H{"message": "Added to cart"})
}

func UpdateQty(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct { ProductID string `json:"product_id"`; Qty int `json:"qty"` }
	c.ShouldBindJSON(&body)
	pOID, _ := primitive.ObjectIDFromHex(body.ProductID)
	col := db.GetCollection("carts")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	if body.Qty <= 0 {
		col.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{"$pull": bson.M{"items": bson.M{"product_id": pOID}}})
	} else {
		col.UpdateOne(ctx, bson.M{"user_id": userID, "items.product_id": pOID}, bson.M{"$set": bson.M{"items.$.qty": body.Qty}})
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cart updated"})
}

func RemoveItem(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	pOID, _ := primitive.ObjectIDFromHex(c.Param("productId"))
	col := db.GetCollection("carts")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	col.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{"$pull": bson.M{"items": bson.M{"product_id": pOID}}})
	c.JSON(http.StatusOK, gin.H{"message": "Removed"})
}

func ClearCart(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("carts")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	col.DeleteOne(ctx, bson.M{"user_id": userID})
	c.JSON(http.StatusOK, gin.H{"message": "Cart cleared"})
}

func GetWishlist(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("wishlists")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var wl models.Wishlist
	col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&wl)
	if len(wl.Products) == 0 { c.JSON(http.StatusOK, gin.H{"products": []interface{}{}}); return }
	prodCol := db.GetCollection("products")
	cursor, _ := prodCol.Find(ctx, bson.M{"_id": bson.M{"$in": wl.Products}})
	var prods []models.Product
	cursor.All(ctx, &prods)
	if prods == nil { prods = []models.Product{} }
	c.JSON(http.StatusOK, gin.H{"products": prods})
}
