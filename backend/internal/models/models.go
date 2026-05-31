package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username   string             `bson:"username" json:"username"`
	Name       string             `bson:"name" json:"name"`
	Email      string             `bson:"email" json:"email"`
	Password   string             `bson:"password" json:"-"`
	Avatar     string             `bson:"avatar" json:"avatar"`
	CoverImage string             `bson:"cover_image" json:"cover_image"`
	Bio        string             `bson:"bio" json:"bio"`
	Company    string             `bson:"company" json:"company"`
	Location   string             `bson:"location" json:"location"`
	Pronouns   string             `bson:"pronouns" json:"pronouns"`
	Role       string             `bson:"role" json:"role"`
	Followers  []primitive.ObjectID `bson:"followers" json:"followers"`
	Following  []primitive.ObjectID `bson:"following" json:"following"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`
}

type UserPublic struct {
	ID          primitive.ObjectID `json:"id"`
	Username    string             `json:"username"`
	Name        string             `json:"name"`
	Email       string             `json:"email"`
	Avatar      string             `json:"avatar"`
	CoverImage  string             `json:"cover_image"`
	Bio         string             `json:"bio"`
	Company     string             `json:"company"`
	Location    string             `json:"location"`
	Role        string             `json:"role"`
	FollowerCount int              `json:"follower_count"`
	FollowingCount int             `json:"following_count"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role"`
}
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
type OTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}
type OTPVerify struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required"`
}

type Post struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	AuthorID  primitive.ObjectID   `bson:"author_id" json:"author_id"`
	Author    *UserPublic          `bson:"-" json:"author,omitempty"`
	Content   string               `bson:"content" json:"content"`
	ImageURL  string               `bson:"image_url" json:"image_url"`
	Likes     []primitive.ObjectID `bson:"likes" json:"likes"`
	LikeCount int                  `bson:"-" json:"like_count"`
	Tags      []string             `bson:"tags" json:"tags"`
	CreatedAt time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time            `bson:"updated_at" json:"updated_at"`
}
type CreatePostRequest struct {
	Content  string   `json:"content" binding:"required"`
	ImageURL string   `json:"image_url"`
	Tags     []string `json:"tags"`
}

type Blog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AuthorID   primitive.ObjectID `bson:"author_id" json:"author_id"`
	Author     *UserPublic        `bson:"-" json:"author,omitempty"`
	Title      string             `bson:"title" json:"title"`
	Summary    string             `bson:"summary" json:"summary"`
	Content    string             `bson:"content" json:"content"`
	CoverImage string             `bson:"cover_image" json:"cover_image"`
	Tags       []string           `bson:"tags" json:"tags"`
	Published  bool               `bson:"published" json:"published"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`
}
type CreateBlogRequest struct {
	Title      string   `json:"title" binding:"required"`
	Summary    string   `json:"summary"`
	Content    string   `json:"content" binding:"required"`
	CoverImage string   `json:"cover_image"`
	Tags       []string `json:"tags"`
	Published  bool     `json:"published"`
}

// Direct Messages
type DirectMessage struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FromID     primitive.ObjectID `bson:"from_id" json:"from_id"`
	ToID       primitive.ObjectID `bson:"to_id" json:"to_id"`
	FromName   string             `bson:"from_name" json:"from_name"`
	FromAvatar string             `bson:"from_avatar" json:"from_avatar"`
	Content    string             `bson:"content" json:"content"`
	Read       bool               `bson:"read" json:"read"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

type Conversation struct {
	UserID     primitive.ObjectID `json:"user_id"`
	Username   string             `json:"username"`
	Name       string             `json:"name"`
	Avatar     string             `json:"avatar"`
	LastMsg    string             `json:"last_message"`
	LastTime   time.Time          `json:"last_time"`
	UnreadCount int               `json:"unread_count"`
}

// WebSocket
type Message struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	RoomID     string             `bson:"room_id" json:"room_id"`
	SenderID   primitive.ObjectID `bson:"sender_id" json:"sender_id"`
	SenderName string             `bson:"sender_name" json:"sender_name"`
	Content    string             `bson:"content" json:"content"`
	Type       string             `bson:"type" json:"type"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}
type WSMessage struct {
	Type      string    `json:"type"`
	RoomID    string    `json:"room_id"`
	Content   string    `json:"content"`
	Sender    string    `json:"sender"`
	SenderID  string    `json:"sender_id"`
	Timestamp time.Time `json:"timestamp"`
}

// ── Store ─────────────────────────────────────────────────────────────────────
type Store struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	OwnerID     primitive.ObjectID   `bson:"owner_id" json:"owner_id"`
	Name        string               `bson:"name" json:"name"`
	Slug        string               `bson:"slug" json:"slug"`
	Logo        string               `bson:"logo" json:"logo"`
	Banner      string               `bson:"banner" json:"banner"`
	Description string               `bson:"description" json:"description"`
	Category    string               `bson:"category" json:"category"`
	Location    string               `bson:"location" json:"location"`
	Phone       string               `bson:"phone" json:"phone"`
	Email       string               `bson:"email" json:"email"`
	Website     string               `bson:"website" json:"website"`
	Rating      float64              `bson:"rating" json:"rating"`
	TotalSales  int                  `bson:"total_sales" json:"total_sales"`
	Revenue     float64              `bson:"revenue" json:"revenue"`
	Followers   []primitive.ObjectID `bson:"followers" json:"followers"`
	Verified    bool                 `bson:"verified" json:"verified"`
	CreatedAt   time.Time            `bson:"created_at" json:"created_at"`
}

// ── Product ────────────────────────────────────────────────────────────────────
type Product struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SellerID      primitive.ObjectID `bson:"seller_id" json:"seller_id"`
	StoreID       primitive.ObjectID `bson:"store_id" json:"store_id"`
	StoreName     string             `bson:"store_name" json:"store_name"`
	Name          string             `bson:"name" json:"name"`
	Slug          string             `bson:"slug" json:"slug"`
	Description   string             `bson:"description" json:"description"`
	Category      string             `bson:"category" json:"category"`
	Brand         string             `bson:"brand" json:"brand"`
	SKU           string             `bson:"sku" json:"sku"`
	Images        []string           `bson:"images" json:"images"`
	Price         float64            `bson:"price" json:"price"`
	Discount      float64            `bson:"discount" json:"discount"` // percentage
	Stock         int                `bson:"stock" json:"stock"`
	Specs         map[string]string  `bson:"specs" json:"specs"`
	Tags          []string           `bson:"tags" json:"tags"`
	Shipping      string             `bson:"shipping" json:"shipping"`
	AvgRating     float64            `bson:"avg_rating" json:"avg_rating"`
	ReviewCount   int                `bson:"review_count" json:"review_count"`
	SoldCount     int                `bson:"sold_count" json:"sold_count"`
	Featured      bool               `bson:"featured" json:"featured"`
	Active        bool               `bson:"active" json:"active"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
}

func (p Product) DiscountedPrice() float64 {
	if p.Discount > 0 {
		return p.Price * (1 - p.Discount/100)
	}
	return p.Price
}

// ── Review ─────────────────────────────────────────────────────────────────────
type Review struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProductID   primitive.ObjectID `bson:"product_id" json:"product_id"`
	UserID      primitive.ObjectID `bson:"user_id" json:"user_id"`
	UserName    string             `bson:"user_name" json:"user_name"`
	UserAvatar  string             `bson:"user_avatar" json:"user_avatar"`
	Rating      int                `bson:"rating" json:"rating"`
	Title       string             `bson:"title" json:"title"`
	Body        string             `bson:"body" json:"body"`
	Images      []string           `bson:"images" json:"images"`
	Helpful     int                `bson:"helpful" json:"helpful"`
	Verified    bool               `bson:"verified" json:"verified"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

// ── Cart ────────────────────────────────────────────────────────────────────────
type CartItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Product   *Product           `bson:"-" json:"product,omitempty"`
	Qty       int                `bson:"qty" json:"qty"`
	Price     float64            `bson:"price" json:"price"`
}
type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Items     []CartItem         `bson:"items" json:"items"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// ── Order ────────────────────────────────────────────────────────────────────────
type OrderItem struct {
	ProductID   primitive.ObjectID `bson:"product_id" json:"product_id"`
	ProductName string             `bson:"product_name" json:"product_name"`
	Image       string             `bson:"image" json:"image"`
	Qty         int                `bson:"qty" json:"qty"`
	Price       float64            `bson:"price" json:"price"`
	SellerID    primitive.ObjectID `bson:"seller_id" json:"seller_id"`
}
type Order struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"user_id" json:"user_id"`
	Items       []OrderItem        `bson:"items" json:"items"`
	Total       float64            `bson:"total" json:"total"`
	Status      string             `bson:"status" json:"status"` // pending/confirmed/shipped/delivered/cancelled
	Address     string             `bson:"address" json:"address"`
	PaymentMode string             `bson:"payment_mode" json:"payment_mode"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

// ── Wishlist ──────────────────────────────────────────────────────────────────────
type Wishlist struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID   `bson:"user_id" json:"user_id"`
	Products  []primitive.ObjectID `bson:"products" json:"products"`
	UpdatedAt time.Time            `bson:"updated_at" json:"updated_at"`
}

// ── Analytics helper ──────────────────────────────────────────────────────────────
type UserStats struct {
	TotalSpent    float64 `json:"total_spent"`
	TotalOrders   int     `json:"total_orders"`
	AvgOrderValue float64 `json:"avg_order_value"`
	TotalEarned   float64 `json:"total_earned"`
	TotalSold     int     `json:"total_sold"`
	ProductsListed int    `json:"products_listed"`
}

// ── Address ────────────────────────────────────────────────────────────────────
type Address struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Label     string             `bson:"label" json:"label"` // Home, Work, Other
	FullName  string             `bson:"full_name" json:"full_name"`
	Phone     string             `bson:"phone" json:"phone"`
	Email     string             `bson:"email" json:"email"`
	House     string             `bson:"house" json:"house"`
	Street    string             `bson:"street" json:"street"`
	City      string             `bson:"city" json:"city"`
	State     string             `bson:"state" json:"state"`
	Country   string             `bson:"country" json:"country"`
	Pincode   string             `bson:"pincode" json:"pincode"`
	Landmark  string             `bson:"landmark" json:"landmark"`
	Lat       float64            `bson:"lat" json:"lat"`
	Lng       float64            `bson:"lng" json:"lng"`
	IsDefault bool               `bson:"is_default" json:"is_default"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

// ── Payment ────────────────────────────────────────────────────────────────────
type Payment struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderID           primitive.ObjectID `bson:"order_id" json:"order_id"`
	UserID            primitive.ObjectID `bson:"user_id" json:"user_id"`
	RazorpayOrderID   string             `bson:"razorpay_order_id" json:"razorpay_order_id"`
	RazorpayPaymentID string             `bson:"razorpay_payment_id" json:"razorpay_payment_id"`
	RazorpaySignature string             `bson:"razorpay_signature" json:"razorpay_signature"`
	Amount            float64            `bson:"amount" json:"amount"`
	Currency          string             `bson:"currency" json:"currency"`
	Method            string             `bson:"method" json:"method"` // upi/card/netbanking/cod/wallet
	Status            string             `bson:"status" json:"status"` // pending/paid/failed/refunded
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
}

// ── Enhanced Order ─────────────────────────────────────────────────────────────
type OrderAddress struct {
	FullName string  `bson:"full_name" json:"full_name"`
	Phone    string  `bson:"phone" json:"phone"`
	Email    string  `bson:"email" json:"email"`
	House    string  `bson:"house" json:"house"`
	Street   string  `bson:"street" json:"street"`
	City     string  `bson:"city" json:"city"`
	State    string  `bson:"state" json:"state"`
	Country  string  `bson:"country" json:"country"`
	Pincode  string  `bson:"pincode" json:"pincode"`
	Landmark string  `bson:"landmark" json:"landmark"`
	Lat      float64 `bson:"lat" json:"lat"`
	Lng      float64 `bson:"lng" json:"lng"`
}

type Invoice struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderID     primitive.ObjectID `bson:"order_id" json:"order_id"`
	UserID      primitive.ObjectID `bson:"user_id" json:"user_id"`
	InvoiceNo   string             `bson:"invoice_no" json:"invoice_no"`
	Items       []OrderItem        `bson:"items" json:"items"`
	Address     OrderAddress       `bson:"address" json:"address"`
	Subtotal    float64            `bson:"subtotal" json:"subtotal"`
	Tax         float64            `bson:"tax" json:"tax"`
	Shipping    float64            `bson:"shipping" json:"shipping"`
	Discount    float64            `bson:"discount" json:"discount"`
	Total       float64            `bson:"total" json:"total"`
	PaymentMode string             `bson:"payment_mode" json:"payment_mode"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}
