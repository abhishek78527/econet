package upload

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/upload")
	g.POST("/image", UploadImage)
}

func UploadImage(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only jpg, png, gif, webp allowed"})
		return
	}
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 5MB)"})
		return
	}

	uploadDir := "./uploads"
	os.MkdirAll(uploadDir, 0755)

	b := make([]byte, 8)
	rand.Read(b)
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), hex.EncodeToString(b), ext)
	fullPath := filepath.Join(uploadDir, filename)

	out, err := os.Create(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save file"})
		return
	}
	defer out.Close()
	io.Copy(out, file)

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	url := fmt.Sprintf("%s/uploads/%s", baseURL, filename)
	c.JSON(http.StatusOK, gin.H{"url": url})
}
