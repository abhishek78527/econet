package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"linkup-backend/internal/db"
	"linkup-backend/internal/models"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/payment")
	g.POST("/create-order", CreateRazorpayOrder)
	g.POST("/verify", VerifyPayment)
	g.POST("/cod", PlaceCOD)
	g.GET("/history", GetPaymentHistory)
}

// POST /api/v1/payment/create-order
// Creates a Razorpay order and returns order_id for frontend
func CreateRazorpayOrder(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))

	var body struct {
		Amount   float64 `json:"amount" binding:"required"` // in INR
		Currency string  `json:"currency"`
		OrderID  string  `json:"order_id"` // our internal order ID
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	if body.Currency == "" { body.Currency = "INR" }

	keyID     := os.Getenv("RAZORPAY_KEY_ID")
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	if keyID == "" || keySecret == "" {
		// Demo mode — return a fake order ID so UI can be shown
		fakeOrderID := fmt.Sprintf("order_demo_%d", time.Now().UnixNano())
		c.JSON(http.StatusOK, gin.H{
			"razorpay_order_id": fakeOrderID,
			"amount":            int(body.Amount * 100),
			"currency":          body.Currency,
			"key_id":            "rzp_test_demo",
			"demo_mode":         true,
		})
		return
	}

	// Call Razorpay API
	payload := map[string]interface{}{
		"amount":   int(body.Amount * 100), // paise
		"currency": body.Currency,
		"receipt":  fmt.Sprintf("rcpt_%s_%d", userID.Hex()[:8], time.Now().Unix()),
	}
	payloadBytes, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "https://api.razorpay.com/v1/orders", strings.NewReader(string(payloadBytes)))
	req.SetBasicAuth(keyID, keySecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Razorpay API error"}); return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if errMsg, ok := result["error"]; ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg}); return
	}

	c.JSON(http.StatusOK, gin.H{
		"razorpay_order_id": result["id"],
		"amount":            result["amount"],
		"currency":          result["currency"],
		"key_id":            keyID,
	})
}

// POST /api/v1/payment/verify
// Verifies Razorpay payment signature and marks order as paid
func VerifyPayment(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))

	var body struct {
		RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
		RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
		RazorpaySignature string `json:"razorpay_signature" binding:"required"`
		InternalOrderID   string `json:"internal_order_id" binding:"required"`
		Method            string `json:"method"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}

	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	// Demo mode
	if keySecret == "" || strings.HasPrefix(body.RazorpayOrderID, "order_demo_") {
		return savePaymentAndUpdateOrder(c, userID, body.RazorpayOrderID, body.RazorpayPaymentID, body.InternalOrderID, body.Method, "paid")
	}

	// Verify HMAC-SHA256 signature
	message := body.RazorpayOrderID + "|" + body.RazorpayPaymentID
	mac := hmac.New(sha256.New, []byte(keySecret))
	mac.Write([]byte(message))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(body.RazorpaySignature)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment verification failed — invalid signature"})
		return
	}

	savePaymentAndUpdateOrder(c, userID, body.RazorpayOrderID, body.RazorpayPaymentID, body.InternalOrderID, body.Method, "paid")
}

// POST /api/v1/payment/cod
func PlaceCOD(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	var body struct {
		InternalOrderID string `json:"internal_order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return
	}
	savePaymentAndUpdateOrder(c, userID, "", "", body.InternalOrderID, "cod", "pending")
}

func savePaymentAndUpdateOrder(c *gin.Context, userID primitive.ObjectID, rzpOrderID, rzpPaymentID, internalOrderID, method, status string) {
	orderOID, _ := primitive.ObjectIDFromHex(internalOrderID)
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)

	payment := models.Payment{
		ID: primitive.NewObjectID(), OrderID: orderOID, UserID: userID,
		RazorpayOrderID: rzpOrderID, RazorpayPaymentID: rzpPaymentID,
		Amount: 0, Currency: "INR", Method: method, Status: status,
		CreatedAt: time.Now(),
	}
	db.GetCollection("payments").InsertOne(ctx, payment)

	// Update order status
	newStatus := "confirmed"
	if method == "cod" { newStatus = "pending" }
	db.GetCollection("orders").UpdateOne(ctx, bson.M{"_id": orderOID},
		bson.M{"$set": bson.M{"status": newStatus, "payment_status": status, "payment_method": method, "updated_at": time.Now()}})

	// Generate invoice number
	invoiceNo := fmt.Sprintf("INV-%d-%s", time.Now().Unix(), internalOrderID[:8])
	db.GetCollection("orders").UpdateOne(ctx, bson.M{"_id": orderOID}, bson.M{"$set": bson.M{"invoice_no": invoiceNo}})

	c.JSON(http.StatusOK, gin.H{"message": "Payment recorded", "status": status, "invoice_no": invoiceNo, "order_id": internalOrderID})
}

// GET /api/v1/payment/history
func GetPaymentHistory(c *gin.Context) {
	userID, _ := primitive.ObjectIDFromHex(c.GetString("user_id"))
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	cursor, _ := db.GetCollection("payments").Find(ctx, bson.M{"user_id": userID})
	var payments []models.Payment
	cursor.All(ctx, &payments)
	if payments == nil { payments = []models.Payment{} }
	c.JSON(http.StatusOK, gin.H{"payments": payments})
}
