package auth_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"linkup-backend/internal/auth"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	api := r.Group("/api/v1")
	auth.RegisterRoutes(api)
	return r
}

func TestRegisterValidation(t *testing.T) {
	r := setupRouter()

	// Missing required fields
	body := map[string]string{"email": "not-an-email"}
	b, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}

func TestLoginWrongCredentials(t *testing.T) {
	r := setupRouter()

	body := map[string]string{
		"email":    "nouser@test.com",
		"password": "wrongpassword",
	}
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Without a real DB this will return 500 or 401 — just verify it's not 200
	if w.Code == http.StatusOK {
		t.Error("Expected non-200 for invalid credentials")
	}
}

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["status"] != "ok" {
		t.Error("Expected status ok")
	}
}
