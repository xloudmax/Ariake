package routes

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"repair-platform/config"
	"repair-platform/database"
	"repair-platform/models"
	"repair-platform/services"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func setupTestRouter() (*gin.Engine, *gorm.DB) {
	gin.SetMode(gin.TestMode)
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	database.RunMigrations(db)

	cfg := &config.Config{
		Environment:      "test",
		RateLimitEnabled: false,
		BasePath:         "./test_uploads",
		AllowedFileTypes: []string{".jpg", ".png"},
		MaxFileSize:      1024 * 1024, // 1MB
	}
	r := gin.New()

	// Provide empty mock services
	notionSvc := &services.NotionService{}
	aiSvc := &services.AIService{}
	ragSvc := &services.GraphRAGService{}

	SetupRoutes(r, db, cfg, notionSvc, aiSvc, ragSvc)
	return r, db
}

func TestHealthRoutes(t *testing.T) {
	r, _ := setupTestRouter()

	t.Run("Ping", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health/ping", nil)
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "ok", response["status"])
	})

	t.Run("DB Health", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health/db", nil)
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "ok", response["status"])
	})

	t.Run("GraphQL Playground", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/graphql", nil)
		r.ServeHTTP(w, req)
		// Should return 200 HTML content for playground when in test mode
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestUploadAvatarRoute_Unauthorized(t *testing.T) {
	r, _ := setupTestRouter()

	w := httptest.NewRecorder()
	// Create a dummy multipart request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/upload/avatar", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Because there is no JWT token, it should be unauthorized
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGraphSearchRoute_ServiceUnavailable(t *testing.T) {
	r, _ := setupTestRouter()

	w := httptest.NewRecorder()
	reqBody := bytes.NewBufferString(`{"query":"test","max_hops":2}`)
	req, _ := http.NewRequest("POST", "/api/graph/search", reqBody)
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

// Ensure JWT tokens are correctly validated and mapped to the user in the context
func TestUploadAvatarRoute_SuccessWithMockedAuth(t *testing.T) {
	r, db := setupTestRouter()

	// Create a user
	user := models.User{Username: "upload_tester", Role: "user"}
	db.Create(&user)

	// Generate JWT manually
	token, _ := models.GenerateJWT(user.ID, user.Username, user.Role, false)

	w := httptest.NewRecorder()

	// File payload
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("avatar", "test.png")
	// Write a fake tiny PNG header
	part.Write([]byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"))
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/upload/avatar", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	r.ServeHTTP(w, req)

	// It should succeed with 200 OK
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, true, response["success"])
	assert.Contains(t, response["filename"].(string), ".png")
}
