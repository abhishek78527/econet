package auth

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"linkup-backend/internal/db"
	"linkup-backend/internal/middleware"
	"linkup-backend/internal/models"
)

var otpStore = map[string]otpEntry{}

type otpEntry struct {
	Code      string
	ExpiresAt time.Time
}

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/auth")
	g.POST("/register", Register)
	g.POST("/login", Login)
	g.POST("/otp/send", SendOTP)
	g.POST("/otp/verify", VerifyOTP)
}

func generateUsername(name string) string {
	// Convert name to lowercase slug
	re := regexp.MustCompile(`[^a-z0-9]`)
	base := re.ReplaceAllString(strings.ToLower(name), "")
	if len(base) < 3 {
		base = "user"
	}
	if len(base) > 15 {
		base = base[:15]
	}
	return fmt.Sprintf("%s%04d", base, rand.Intn(9999))
}

func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := col.FindOne(ctx, bson.M{"email": req.Email}).Err(); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not hash password"})
		return
	}
	if req.Role == "" { req.Role = "user" }

	// Generate unique username
	username := generateUsername(req.Name)
	for {
		var existing models.User
		if col.FindOne(ctx, bson.M{"username": username}).Decode(&existing) != nil {
			break // username is unique
		}
		username = generateUsername(req.Name)
	}

	user := models.User{
		ID: primitive.NewObjectID(), Name: req.Name, Email: req.Email,
		Username: username, Password: string(hash), Role: req.Role,
		Followers: []primitive.ObjectID{}, Following: []primitive.ObjectID{},
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if _, err := col.InsertOne(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user"})
		return
	}
	token, _ := generateToken(user)
	c.JSON(http.StatusCreated, gin.H{"token": token, "user": toPublic(user)})
}

func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var user models.User
	if err := col.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user); err == mongo.ErrNoDocuments {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	token, _ := generateToken(user)
	c.JSON(http.StatusOK, gin.H{"token": token, "user": toPublic(user)})
}

func SendOTP(c *gin.Context) {
	var req models.OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	otp := fmt.Sprintf("%06d", rand.Intn(1000000))
	otpStore[req.Email] = otpEntry{Code: otp, ExpiresAt: time.Now().Add(10 * time.Minute)}

	fmt.Printf("\n╔══════════════════════════════╗\n║  OTP for %-20s║\n║  Code: %-22s║\n╚══════════════════════════════╝\n\n", req.Email, otp)

	resp := gin.H{"message": "OTP sent to " + req.Email}

	// Try real email
	emailErr := sendOTPEmail(req.Email, otp)
	if emailErr != nil || os.Getenv("SMTP_HOST") == "" {
		resp["demo_otp"] = otp
		if os.Getenv("SMTP_HOST") != "" && emailErr != nil {
			fmt.Printf("Email error: %v\n", emailErr)
			resp["email_error"] = "Could not send email, using demo OTP"
		}
	}
	c.JSON(http.StatusOK, resp)
}

func VerifyOTP(c *gin.Context) {
	var req models.OTPVerify
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry, ok := otpStore[req.Email]
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No OTP found for this email. Please request a new one."})
		return
	}
	if entry.Code != req.OTP {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect OTP. Please check and try again."})
		return
	}
	if time.Now().After(entry.ExpiresAt) {
		delete(otpStore, req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "OTP expired. Please request a new one."})
		return
	}
	delete(otpStore, req.Email)

	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var user models.User
	if err := col.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user); err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found. Please register first."})
		return
	}
	token, _ := generateToken(user)
	c.JSON(http.StatusOK, gin.H{"token": token, "user": toPublic(user), "verified": true})
}

func generateToken(user models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" { secret = "linkup-default-secret-change-in-production" }
	claims := middleware.Claims{
		UserID: user.ID.Hex(), Email: user.Email, Name: user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func toPublic(u models.User) models.UserPublic {
	return models.UserPublic{
		ID: u.ID, Username: u.Username, Name: u.Name, Email: u.Email,
		Avatar: u.Avatar, CoverImage: u.CoverImage, Bio: u.Bio,
		Company: u.Company, Location: u.Location, Role: u.Role,
		FollowerCount: len(u.Followers), FollowingCount: len(u.Following),
	}
}
