package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"repair-platform/config"
	"repair-platform/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// ensure config is loaded with email verification required
func setupConfigForJWTTest() {
	os.Setenv("GIN_MODE", "production")
	os.Setenv("EMAIL_ENABLED", "true")
	os.Setenv("JWT_SECRET", "test_secret_for_ci_execution_123456")
	config.GetConfig()
}

func TestOptionalJWTMarksUnverified(t *testing.T) {
	setupConfigForJWTTest()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	user := models.User{Username: "u", Email: "u@example.com", IsVerified: false, Role: "USER"}
	if err := user.SetPassword("Str0ngPass123"); err != nil {
		t.Fatalf("set password: %v", err)
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	token, err := models.GenerateJWT(user.ID, user.Username, user.Role, false)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
	})
	r.Use(OptionalJWTAuthMiddleware())
	r.GET("/me", func(c *gin.Context) {
		isVerified, _ := c.Get("is_verified")
		c.JSON(http.StatusOK, gin.H{"is_verified": isVerified})
	})

	req := httptest.NewRequest("GET", "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unverified user, got %d", w.Code)
	}
	if body := w.Body.String(); !strings.Contains(body, "Email not verified") {
		t.Fatalf("expected verification error, got %s", body)
	}
}

func TestJWTAuthMiddleware(t *testing.T) {
	os.Setenv("GIN_MODE", "test")
	// Set mock config for JWT secret
	os.Setenv("JWT_SECRET", "test_super_secret_key_12345")
	os.Setenv("SKIP_EMAIL_VERIFICATION", "true")

	// We need to bypass the DB lookup in middleware if it expects it
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	db.AutoMigrate(&models.User{})

	validUser := &models.User{
		Username:   "jwtuser",
		Role:       "user",
		IsVerified: true,
	}
	validUser.ID = 1
	db.Create(validUser)

	validToken, _ := models.GenerateJWT(validUser.ID, validUser.Username, validUser.Role, false)

	// For simplicity in test, let's just alter the signature part of a valid token
	parts := strings.Split(validToken, ".")
	tamperedTokenStr := parts[0] + "." + parts[1] + ".invalid_signature"

	tests := []struct {
		name         string
		tokenStr     string
		expectedCode int
	}{
		{
			name:         "Valid Token",
			tokenStr:     "Bearer " + validToken,
			expectedCode: http.StatusOK,
		},
		{
			name:         "Missing Token",
			tokenStr:     "",
			expectedCode: http.StatusUnauthorized,
		},
		{
			name:         "Malformed Header Prefix",
			tokenStr:     "Token " + validToken,
			expectedCode: http.StatusUnauthorized,
		},
		{
			name:         "Invalid Signature",
			tokenStr:     "Bearer " + tamperedTokenStr,
			expectedCode: http.StatusUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("db", db)
			})
			router.Use(JWTAuthMiddleware())
			router.GET("/protected", func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			req, _ := http.NewRequest("GET", "/protected", nil)
			if tc.tokenStr != "" {
				req.Header.Set("Authorization", tc.tokenStr)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedCode {
				t.Errorf("expected status %d, got %d", tc.expectedCode, w.Code)
			}
		})
	}
}
