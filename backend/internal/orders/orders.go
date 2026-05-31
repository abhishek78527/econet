package orders

import (
	"context"
	"fmt"
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
	g.GET("/seller/stats", GetSellerStats)
	g.GET("/:id", GetOrderDetail)
	g.PUT("/:id/status", UpdateStatus)
	g.POST("/:id/reorder", Reorder)
}

type CheckoutAddress struct {
	FullName string  `json:"full_name"`
	Phone    string  `json:"phone"`
	Email    string  `json:"email"`
	House    string  `json:"house"`
	Street   string  `json:"street"`
	City     string  `json:"city"`
	State    string  `json:"state"`
	Country  string  `json:"country"`
	Pincode  string  `json:"pincode"`
	Landmark string  `json:"landmark"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

func PlaceOrder(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		Items []struct {
			ProductID string `json:"product_id"`
			Qty       int    `json:"qty"`
		} `json:"items" binding:"required"`
		Address     CheckoutAddress `json:"address"`
		PaymentMode string          `json:"payment_mode"`
		Coupon      string          `json:"coupon"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}

	prodCol := db.GetCollection("products")
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)

	var orderItems []models.OrderItem
	subtotal := 0.0
	for _, item := range body.Items {
		oid, _ := primitive.ObjectIDFromHex(item.ProductID)
		var p models.Product
		if err := prodCol.FindOne(ctx, bson.M{"_id": oid}).Decode(&p); err != nil { continue }
		if p.Stock < item.Qty {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Insufficient stock for %s", p.Name)}); return
		}
		price := p.DiscountedPrice()
		img := ""
		if len(p.Images) > 0 { img = p.Images[0] }
		orderItems = append(orderItems, models.OrderItem{
			ProductID: oid, ProductName: p.Name, Image: img,
			Qty: item.Qty, Price: price, SellerID: p.SellerID,
		})
		subtotal += price * float64(item.Qty)
		prodCol.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$inc": bson.M{"stock": -item.Qty, "sold_count": item.Qty}})
	}

	// Calculate totals
	shipping := 0.0
	if subtotal < 499 { shipping = 49.0 }
	tax := subtotal * 0.18 // 18% GST
	discount := 0.0
	if body.Coupon == "ECONET10" { discount = subtotal * 0.10 }
	if body.Coupon == "FIRST50" { discount = 50.0 }
	total := subtotal + shipping + tax - discount

	// Build address
	addr := models.OrderAddress{
		FullName: body.Address.FullName, Phone: body.Address.Phone, Email: body.Address.Email,
		House: body.Address.House, Street: body.Address.Street, City: body.Address.City,
		State: body.Address.State, Country: body.Address.Country, Pincode: body.Address.Pincode,
		Landmark: body.Address.Landmark, Lat: body.Address.Lat, Lng: body.Address.Lng,
	}

	invoiceNo := fmt.Sprintf("INV-%d", time.Now().UnixNano()/1e6)

	order := models.Order{
		ID: primitive.NewObjectID(), UserID: userID,
		Items: orderItems, Total: total, Status: "pending",
		Address: addr.House + ", " + addr.Street + ", " + addr.City + ", " + addr.State + " " + addr.Pincode,
		PaymentMode: body.PaymentMode,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}

	col := db.GetCollection("orders")
	col.InsertOne(ctx, order)

	// Save invoice
	invoice := models.Invoice{
		ID: primitive.NewObjectID(), OrderID: order.ID, UserID: userID,
		InvoiceNo: invoiceNo, Items: orderItems, Address: addr,
		Subtotal: subtotal, Tax: tax, Shipping: shipping, Discount: discount, Total: total,
		PaymentMode: body.PaymentMode, CreatedAt: time.Now(),
	}
	db.GetCollection("invoices").InsertOne(ctx, invoice)

	// Update seller stats
	sellerMap := map[primitive.ObjectID]float64{}
	for _, item := range orderItems { sellerMap[item.SellerID] += item.Price * float64(item.Qty) }
	storeCol := db.GetCollection("stores")
	for sid, rev := range sellerMap {
		storeCol.UpdateOne(ctx, bson.M{"owner_id": sid}, bson.M{"$inc": bson.M{"revenue": rev, "total_sales": 1}})
	}

	// Clear cart
	db.GetCollection("carts").DeleteOne(ctx, bson.M{"user_id": userID})

	c.JSON(http.StatusCreated, gin.H{
		"order": order, "invoice_no": invoiceNo,
		"totals": gin.H{"subtotal": subtotal, "tax": tax, "shipping": shipping, "discount": discount, "total": total},
	})
}

func GetMyOrders(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, _ := db.GetCollection("orders").Find(ctx, bson.M{"user_id": userID}, opts)
	var orders []models.Order
	cursor.All(ctx, &orders)
	if orders == nil { orders = []models.Order{} }
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func GetOrderDetail(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var order models.Order
	db.GetCollection("orders").FindOne(ctx, bson.M{"_id": oid}).Decode(&order)
	var invoice models.Invoice
	db.GetCollection("invoices").FindOne(ctx, bson.M{"order_id": oid}).Decode(&invoice)
	c.JSON(http.StatusOK, gin.H{"order": order, "invoice": invoice})
}

func GetStats(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	cursor, _ := db.GetCollection("orders").Find(ctx, bson.M{"user_id": userID})
	var orders []models.Order
	cursor.All(ctx, &orders)
	totalSpent := 0.0
	for _, o := range orders { if o.Status != "cancelled" { totalSpent += o.Total } }
	avgVal := 0.0
	if len(orders) > 0 { avgVal = totalSpent / float64(len(orders)) }
	prodCol := db.GetCollection("products")
	count, _ := prodCol.CountDocuments(ctx, bson.M{"seller_id": userID, "active": true})
	cursor2, _ := db.GetCollection("orders").Find(ctx, bson.M{})
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
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, _ := db.GetCollection("orders").Find(ctx, bson.M{"items.seller_id": sellerID}, opts)
	var orders []models.Order
	cursor.All(ctx, &orders)
	if orders == nil { orders = []models.Order{} }
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func GetSellerStats(c *gin.Context) {
	sellerID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	cursor, _ := db.GetCollection("orders").Find(ctx, bson.M{"items.seller_id": sellerID})
	var orders []models.Order
	cursor.All(ctx, &orders)
	revenue := 0.0; totalSold := 0
	codOrders := 0; paidOrders := 0
	for _, o := range orders {
		for _, item := range o.Items {
			if item.SellerID == sellerID {
				revenue += item.Price * float64(item.Qty)
				totalSold += item.Qty
			}
		}
		if o.PaymentMode == "cod" { codOrders++ } else { paidOrders++ }
	}
	prodCount, _ := db.GetCollection("products").CountDocuments(ctx, bson.M{"seller_id": sellerID, "active": true})
	// Low stock alerts
	lowCursor, _ := db.GetCollection("products").Find(ctx, bson.M{"seller_id": sellerID, "active": true, "stock": bson.M{"$lte": 5}})
	var lowStock []models.Product
	lowCursor.All(ctx, &lowStock)
	c.JSON(http.StatusOK, gin.H{
		"revenue": revenue, "total_sold": totalSold, "total_orders": len(orders),
		"cod_orders": codOrders, "paid_orders": paidOrders,
		"products_listed": prodCount, "low_stock_alerts": lowStock,
	})
}

func UpdateStatus(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	var body struct{ Status string `json:"status"` }
	c.ShouldBindJSON(&body)
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	db.GetCollection("orders").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"status": body.Status, "updated_at": time.Now()}})
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}

func Reorder(c *gin.Context) {
	oid, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	var order models.Order
	if err := db.GetCollection("orders").FindOne(ctx, bson.M{"_id": oid, "user_id": userID}).Decode(&order); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"}); return
	}
	// Add all items back to cart
	for _, item := range order.Items {
		db.GetCollection("carts").UpdateOne(ctx, bson.M{"user_id": userID},
			bson.M{"$push": bson.M{"items": models.CartItem{ProductID: item.ProductID, Qty: item.Qty, Price: item.Price}},
				"$set": bson.M{"updated_at": time.Now()}},
			options.Update().SetUpsert(true))
	}
	c.JSON(http.StatusOK, gin.H{"message": "Items added to cart"})
}
