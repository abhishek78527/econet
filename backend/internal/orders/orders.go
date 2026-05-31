package orders

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
	g := rg.Group("/orders")
	g.POST("", PlaceOrder)
	g.GET("", GetMyOrders)
	g.GET("/stats", GetStats)
	g.GET("/seller", GetSellerOrders)
	g.PUT("/:id/status", UpdateStatus)
}

func PlaceOrder(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		Items       []struct {
			ProductID string  `json:"product_id"`
			Qty       int     `json:"qty"`
		} `json:"items" binding:"required"`
		Address     string `json:"address"`
		PaymentMode string `json:"payment_mode"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	prodCol := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	var orderItems []models.OrderItem
	total := 0.0
	for _, item := range body.Items {
		oid, _ := primitive.ObjectIDFromHex(item.ProductID)
		var p models.Product
		if err := prodCol.FindOne(ctx, bson.M{"_id": oid}).Decode(&p); err != nil { continue }
		price := p.DiscountedPrice()
		orderItems = append(orderItems, models.OrderItem{
			ProductID: oid, ProductName: p.Name,
			Image: func() string { if len(p.Images) > 0 { return p.Images[0] }; return "" }(),
			Qty: item.Qty, Price: price, SellerID: p.SellerID,
		})
		total += price * float64(item.Qty)
		// Decrement stock
		prodCol.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$inc": bson.M{"stock": -item.Qty, "sold_count": item.Qty}})
	}
	order := models.Order{
		ID: primitive.NewObjectID(), UserID: userID,
		Items: orderItems, Total: total, Status: "confirmed",
		Address: body.Address, PaymentMode: body.PaymentMode,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	col := db.GetCollection("orders")
	col.InsertOne(ctx, order)
	// Update seller revenue
	sellerMap := map[primitive.ObjectID]float64{}
	for _, item := range orderItems { sellerMap[item.SellerID] += item.Price * float64(item.Qty) }
	storeCol := db.GetCollection("stores")
	for sid, rev := range sellerMap {
		storeCol.UpdateOne(ctx, bson.M{"owner_id": sid}, bson.M{"$inc": bson.M{"revenue": rev, "total_sales": 1}})
	}
	// Clear cart
	cartCol := db.GetCollection("carts")
	cartCol.DeleteOne(ctx, bson.M{"user_id": userID})
	c.JSON(http.StatusCreated, gin.H{"order": order})
}

func GetMyOrders(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("orders")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, _ := col.Find(ctx, bson.M{"user_id": userID}, opts)
	var orders []models.Order
	cursor.All(ctx, &orders)
	if orders == nil { orders = []models.Order{} }
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func GetStats(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("orders")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	cursor, _ := col.Find(ctx, bson.M{"user_id": userID})
	var orders []models.Order
	cursor.All(ctx, &orders)
	totalSpent := 0.0
	for _, o := range orders { if o.Status != "cancelled" { totalSpent += o.Total } }
	avgVal := 0.0
	if len(orders) > 0 { avgVal = totalSpent / float64(len(orders)) }
	// Seller earnings
	prodCol := db.GetCollection("products")
	count, _ := prodCol.CountDocuments(ctx, bson.M{"seller_id": userID, "active": true})
	// Total sold from orders as seller
	cursor2, _ := col.Find(ctx, bson.M{})
	var allOrders []models.Order
	cursor2.All(ctx, &allOrders)
	earned := 0.0; sold := 0
	for _, o := range allOrders {
		for _, item := range o.Items {
			if item.SellerID == userID { earned += item.Price * float64(item.Qty); sold += item.Qty }
		}
	}
	c.JSON(http.StatusOK, gin.H{"stats": models.UserStats{
		TotalSpent: totalSpent, TotalOrders: len(orders), AvgOrderValue: avgVal,
		TotalEarned: earned, TotalSold: sold, ProductsListed: int(count),
	}})
}

func GetSellerOrders(c *gin.Context) {
	sellerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	col := db.GetCollection("orders")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	cursor, _ := col.Find(ctx, bson.M{"items.seller_id": sellerID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	var orders []models.Order
	cursor.All(ctx, &orders)
	if orders == nil { orders = []models.Order{} }
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func UpdateStatus(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	var body struct { Status string `json:"status"` }
	c.ShouldBindJSON(&body)
	col := db.GetCollection("orders")
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"status": body.Status, "updated_at": time.Now()}})
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}
