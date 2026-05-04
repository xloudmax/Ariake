package services

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm"
	"repair-platform/models"
)

func mustCreateTestUser(t *testing.T, db *gorm.DB, username, role string) *models.User {
	t.Helper()

	slug := strings.ToLower(strings.ReplaceAll(username, " ", "-"))
	user := &models.User{
		Username:   username,
		Email:      fmt.Sprintf("%s-%d@example.test", slug, time.Now().UnixNano()),
		Password:   "test-password",
		Role:       role,
		IsActive:   true,
		IsVerified: true,
	}

	if err := db.Create(user).Error; err != nil {
		t.Fatalf("create test user %q: %v", username, err)
	}

	return user
}
