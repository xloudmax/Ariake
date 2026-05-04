package main

import (
	"testing"

	"repair-platform/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func TestEnsureAdminAccountDoesNotResetExistingPassword(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	admin := models.User{
		Username:   "admin",
		Email:      "admin@example.com",
		Role:       "ADMIN",
		IsAdmin:    true,
		IsVerified: true,
		IsActive:   true,
	}
	if err := admin.SetPassword("custom-pass"); err != nil {
		t.Fatalf("set password: %v", err)
	}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}

	ensureAdminAccount(db)

	var reloaded models.User
	if err := db.Where("username = ?", "admin").First(&reloaded).Error; err != nil {
		t.Fatalf("reload admin: %v", err)
	}
	if !reloaded.CheckPassword("custom-pass") {
		t.Fatalf("expected existing admin password to stay unchanged")
	}
	if reloaded.CheckPassword("admin123456") {
		t.Fatalf("expected default password to not overwrite existing admin credentials")
	}
}
