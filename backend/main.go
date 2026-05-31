package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"linkup-backend/internal/address"
	"linkup-backend/internal/auth"
	"linkup-backend/internal/blogs"
	"linkup-backend/internal/cart"
	"linkup-backend/internal/chat"
	"linkup-backend/internal/db"
	"linkup-backend/internal/dm"
	"linkup-backend/internal/middleware"
	"linkup-backend/internal/orders"
	"linkup-backend/internal/payment"
	"linkup-backend/internal/posts"
	"linkup-backend/internal/products"
	"linkup-backend/internal/store"
	"linkup-backend/internal/upload"
	"linkup-backend/internal/users"
)

func main() {
	if err := godotenv.Load(); err != nil { log.Println("No .env file") }
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.Connect(ctx); err != nil { log.Fatal("MongoDB:", err) }
	defer db.Disconnect(context.Background())

	r := gin.Default()
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" { frontendURL = "http://localhost:5173" }

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL, "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true, MaxAge: 12 * time.Hour,
	}))

	r.Static("/uploads", "./uploads")
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "EcoNet API v4"})
	})

	api := r.Group("/api/v1")
	auth.RegisterRoutes(api)

	p := api.Group("")
	p.Use(middleware.AuthRequired())
	users.RegisterRoutes(p)
	posts.RegisterRoutes(p)
	blogs.RegisterRoutes(p)
	upload.RegisterRoutes(p)
	dm.RegisterRoutes(p)
	store.RegisterRoutes(p)
	products.RegisterRoutes(p)
	orders.RegisterRoutes(p)
	cart.RegisterRoutes(p)
	payment.RegisterRoutes(p)
	address.RegisterRoutes(p)

	r.GET("/ws/chat", middleware.WSAuth(), chat.HandleWebSocket)

	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	log.Printf("EcoNet API v4 on :%s", port)
	if err := r.Run(":" + port); err != nil { log.Fatal(err) }
}
