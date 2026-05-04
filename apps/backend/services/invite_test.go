package services

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"repair-platform/models"
)

func timePtr(t time.Time) *time.Time {
	return &t
}

func setupTestInviteDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Migrate InviteCode, User for foreignkeys
	if err := db.AutoMigrate(&models.User{}, &models.InviteCode{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestInviteCodeService(t *testing.T) {
	db := setupTestInviteDB(t)
	inviteSvc := NewInviteCodeService(db)

	// Create a dummy user
	adminUser := mustCreateTestUser(t, db, "admin", "ADMIN")

	t.Run("Create Invite Code", func(t *testing.T) {
		input := &models.CreateInviteCodeInput{
			ExpiresAt:   timePtr(time.Now().Add(24 * time.Hour)),
			MaxUses:     5,
			Description: "Test Code",
		}
		code, err := inviteSvc.CreateInviteCode(adminUser.ID, input)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}
		if code.Code == "" {
			t.Fatal("expected non-empty invite code")
		}
		if code.MaxUses != 5 {
			t.Errorf("expected max_uses=5, got %d", code.MaxUses)
		}
	})

	t.Run("Use Invite Code", func(t *testing.T) {
		input := &models.CreateInviteCodeInput{
			ExpiresAt:   timePtr(time.Now().Add(24 * time.Hour)),
			MaxUses:     1, // Only 1 use allowed
			Description: "Single Use Code",
		}
		code, _ := inviteSvc.CreateInviteCode(adminUser.ID, input)

		// Create dummy user to use it
		normalUser := mustCreateTestUser(t, db, "normal", "user")

		err := inviteSvc.UseInviteCode(code.Code, normalUser.ID)
		if err != nil {
			t.Fatalf("expected success using code, got %v", err)
		}

		// Try to use it again (should fail)
		normalUser2 := mustCreateTestUser(t, db, "normal2", "user")

		err = inviteSvc.UseInviteCode(code.Code, normalUser2.ID)
		if err == nil {
			t.Fatal("expected error using exhausted code, got nil")
		}
	})

	t.Run("Expired Invite Code", func(t *testing.T) {
		input := &models.CreateInviteCodeInput{
			ExpiresAt:   timePtr(time.Now().Add(-24 * time.Hour)), // Expired yesterday
			MaxUses:     10,
			Description: "Expired Code",
		}
		code, _ := inviteSvc.CreateInviteCode(adminUser.ID, input)

		normalUser := mustCreateTestUser(t, db, "normal3", "user")

		err := inviteSvc.UseInviteCode(code.Code, normalUser.ID)
		if err == nil {
			t.Fatal("expected error using expired code, got nil")
		}
	})

	t.Run("Deactivated Invite Code", func(t *testing.T) {
		input := &models.CreateInviteCodeInput{
			ExpiresAt:   timePtr(time.Now().Add(24 * time.Hour)),
			MaxUses:     10,
			Description: "To be deactivated Code",
		}
		code, _ := inviteSvc.CreateInviteCode(adminUser.ID, input)

		err := inviteSvc.DeactivateInviteCode(code.ID)
		if err != nil {
			t.Fatalf("failed to deactivate: %v", err)
		}

		normalUser := mustCreateTestUser(t, db, "normal4", "user")

		err = inviteSvc.UseInviteCode(code.Code, normalUser.ID)
		if err == nil {
			t.Fatal("expected error using deactivated code, got nil")
		}
	})
}
