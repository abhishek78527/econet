package upload

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
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
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "No image provided"}); return }
	defer file.Close()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !map[string]bool{".jpg":true,".jpeg":true,".png":true,".gif":true,".webp":true}[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only jpg/png/gif/webp allowed"}); return
	}
	if header.Size > 5*1024*1024 { c.JSON(http.StatusBadRequest, gin.H{"error": "Max 5MB"}); return }
	fileBytes, err := io.ReadAll(file)
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Read failed"}); return }

	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey    := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cloudName != "" && apiKey != "" && apiSecret != "" {
		if url, err := uploadToCloudinary(fileBytes, header.Filename, cloudName, apiKey, apiSecret); err == nil {
			c.JSON(http.StatusOK, gin.H{"url": url}); return
		}
	}

	// Fallback: local
	os.MkdirAll("./uploads", 0755)
	fname := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	os.WriteFile(filepath.Join("./uploads", fname), fileBytes, 0644)
	base := os.Getenv("BASE_URL")
	if base == "" { base = "http://localhost:8080" }
	c.JSON(http.StatusOK, gin.H{"url": fmt.Sprintf("%s/uploads/%s", base, fname)})
}

func uploadToCloudinary(fileBytes []byte, filename, cloudName, apiKey, apiSecret string) (string, error) {
	ts := fmt.Sprintf("%d", time.Now().Unix())
	sig := fmt.Sprintf("folder=econet&timestamp=%s%s", ts, apiSecret)
	h := sha256.New(); h.Write([]byte(sig))
	signature := hex.EncodeToString(h.Sum(nil))
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", filename)
	fw.Write(fileBytes)
	w.WriteField("api_key", apiKey)
	w.WriteField("timestamp", ts)
	w.WriteField("folder", "econet")
	w.WriteField("signature", signature)
	w.Close()
	resp, err := http.Post(fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", cloudName), w.FormDataContentType(), &buf)
	if err != nil { return "", err }
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if url, ok := result["secure_url"].(string); ok { return url, nil }
	return "", fmt.Errorf("cloudinary: %v", result["error"])
}
