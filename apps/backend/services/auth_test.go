package services

import (
	"os"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"repair-platform/models"
)

func setupTestAuthDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.InviteCode{}, &models.RefreshToken{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestAuthRegisterUser(t *testing.T) {
	os.Setenv("GIN_MODE", "test") // bypass email sending
	db := setupTestAuthDB(t)
	authSvc := NewAuthService(db)

	t.Run("Valid Registration", func(t *testing.T) {
		input := &models.RegisterInput{
			Username: "testuser1",
			Email:    "test1@example.com",
			Password: "SecureTempPass1!", // Has upper, lower, and number
		}
		user, token, refresh, err := authSvc.Register(input)
		if err != nil {
			t.Fatalf("expected successful registration, got %v", err)
		}
		if user == nil || token == "" || refresh == "" {
			t.Fatalf("expected user, token, and refresh token, got nil/empty")
		}
		if user.Role != "user" {
			t.Errorf("expected role user, got %s", user.Role)
		}
	})

	t.Run("Duplicate Username", func(t *testing.T) {
		input := &models.RegisterInput{
			Username: "testuser1", // Same username
			Email:    "unique@example.com",
			Password: "SecureTempPass1!",
		}
		_, _, _, err := authSvc.Register(input)
		if err == nil {
			t.Fatal("expected error due to duplicate username, got nil")
		}
	})

	t.Run("Weak Password Rejected", func(t *testing.T) {
		input := &models.RegisterInput{
			Username: "weakuser",
			Email:    "weak@example.com",
			Password: "weak", // Fails complexity
		}
		_, _, _, err := authSvc.Register(input)
		if err == nil {
			t.Fatal("expected error due to weak password, got nil")
		}
	})

	t.Run("Admin Invite Code Registration", func(t *testing.T) {
		os.Setenv("ADMIN_INVITE_CODE", "SUPERSECRET")
		defer os.Unsetenv("ADMIN_INVITE_CODE")

		input := &models.RegisterInput{
			Username:   "adminuser",
			Email:      "admin@example.com",
			Password:   "SecureTempPass1!",
			InviteCode: "SUPERSECRET",
		}
		user, _, _, err := authSvc.Register(input)
		if err != nil {
			t.Fatalf("expected successful registration, got %v", err)
		}
		if user.Role != "ADMIN" {
			t.Errorf("expected role ADMIN, got %s", user.Role)
		}
	})
}

func TestAuthLoginUser(t *testing.T) {
	os.Setenv("GIN_MODE", "test")
	db := setupTestAuthDB(t)
	authSvc := NewAuthService(db)

	// Seed user
	input := &models.RegisterInput{
		Username: "loginuser",
		Email:    "login@example.com",
		Password: "SecureTempPass1!",
	}
	_, _, _, err := authSvc.Register(input)
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	t.Run("Valid Login By Username", func(t *testing.T) {
		loginInput := &models.LoginInput{
			Identifier: "loginuser",
			Password:   "SecureTempPass1!",
		}
		user, token, refresh, err := authSvc.LoginUser(loginInput)
		if err != nil {
			t.Fatalf("expected successful login, got %v", err)
		}
		if user == nil || token == "" || refresh == "" {
			t.Fatalf("expected user, token, and refresh token, got nil/empty")
		}
	})

	t.Run("Valid Login By Email", func(t *testing.T) {
		loginInput := &models.LoginInput{
			Identifier: "login@example.com",
			Password:   "SecureTempPass1!",
		}
		_, _, _, err := authSvc.LoginUser(loginInput)
		if err != nil {
			t.Fatalf("expected successful login by email, got %v", err)
		}
	})

	t.Run("Invalid Password", func(t *testing.T) {
		loginInput := &models.LoginInput{
			Identifier: "loginuser",
			Password:   "WrongPassword123",
		}
		_, _, _, err := authSvc.LoginUser(loginInput)
		if err == nil {
			t.Fatal("expected error for wrong password, got nil")
		}
	})

	t.Run("Account Lockout After Failures", func(t *testing.T) {
		loginInput := &models.LoginInput{
			Identifier: "loginuser",
			Password:   "WrongPassword123",
		}
		// Assuming lockout happens after 5 tries (as common in logic)
		for i := 0; i < 6; i++ {
			authSvc.LoginUser(loginInput)
		}
		// Now even true password should fail if locked
		loginInput.Password = "SecureTempPass1!"
		_, _, _, err := authSvc.LoginUser(loginInput)
		if err == nil {
			t.Fatalf("expected account to be locked, but login succeeded")
		}
	})
}
