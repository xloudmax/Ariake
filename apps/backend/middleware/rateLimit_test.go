package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// Test rateLimiter sliding window behavior
func TestRateLimiterAllow(t *testing.T) {
	l := getRateLimiter(50*time.Millisecond, 2)

	allowed, count := l.Allow("1.1.1.1", "/graphql")
	if !allowed || count != 1 {
		t.Fatalf("first request should be allowed, count=%d", count)
	}
	allowed, count = l.Allow("1.1.1.1", "/graphql")
	if !allowed || count != 2 {
		t.Fatalf("second request should be allowed, count=%d", count)
	}
	allowed, count = l.Allow("1.1.1.1", "/graphql")
	if allowed {
		t.Fatalf("third request should be blocked, count=%d", count)
	}

	// wait for window to slide and ensure it resets
	time.Sleep(60 * time.Millisecond)
	allowed, _ = l.Allow("1.1.1.1", "/graphql")
	if !allowed {
		t.Fatalf("request after window should be allowed")
	}
}

// Test ConditionalRateLimit middleware returns 429
func TestConditionalRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(ConditionalRateLimit(50*time.Millisecond, 1, "/graphql"))
	r.GET("/graphql", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/health", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest("GET", "/graphql", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("first request should succeed, got %d", w.Code)
	}

	// second request in window should be rate limited
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req)
	if w2.Code != http.StatusTooManyRequests {
		t.Fatalf("second request should be 429, got %d", w2.Code)
	}

	// health path not limited
	healthReq := httptest.NewRequest("GET", "/health", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, healthReq)
	if w3.Code != http.StatusOK {
		t.Fatalf("health should not be limited, got %d", w3.Code)
	}
}

// Admin users should bypass rate limiting
func TestRateLimitAdminBypass(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("role", "ADMIN")
		c.Set("username", "admin")
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.Use(ConditionalRateLimit(100*time.Millisecond, 1))
	r.GET("/graphql", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest("GET", "/graphql", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req)

	if w1.Code != http.StatusOK || w2.Code != http.StatusOK {
		t.Fatalf("admin requests should bypass limits, got %d and %d", w1.Code, w2.Code)
	}
}
