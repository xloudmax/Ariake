package services

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"repair-platform/models"
)

func setupTestUserDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Migrate User
	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestUserService(t *testing.T) {
	db := setupTestUserDB(t)
	userSvc := NewUserService(db)
	adminSvc := NewAdminService(db)

	// Seed users
	admin := &models.User{Username: "admin", Email: "admin@test.com", Role: "admin"}
	user1 := &models.User{Username: "user1", Email: "user1@test.com", Role: "user"}
	user2 := &models.User{Username: "user2", Email: "user2@test.com", Role: "user"}

	db.Create(admin)
	db.Create(user1)
	db.Create(user2)

	t.Run("Get User By ID", func(t *testing.T) {
		u, err := userSvc.GetUserByID(user1.ID)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}
		if u.Username != "user1" {
			t.Errorf("expected user1, got %s", u.Username)
		}
	})

	t.Run("Update User Profile", func(t *testing.T) {
		bio := "New Bio"
		input := &models.UpdateProfileInput{
			Bio: &bio,
		}
		u, err := userSvc.UpdateProfile(user1.ID, input)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}
		if u.Bio != "New Bio" {
			t.Errorf("expected updated bio, got %s", u.Bio)
		}
	})

	t.Run("Update User Role (Admin Operation)", func(t *testing.T) {
		role := "editor"
		u, err := adminSvc.UpdateUser(user2.ID, nil, nil, &role, nil, nil)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}

		if u.Role != "editor" {
			t.Errorf("expected role editor, got %s", u.Role)
		}
	})

	t.Run("Delete User (Admin Operation)", func(t *testing.T) {
		err := adminSvc.DeleteUser(user2.ID)
		if err != nil {
			t.Fatalf("expected success deleting user2, got %v", err)
		}
		_, err = userSvc.GetUserByID(user2.ID)
		if err == nil {
			t.Fatal("expected user to be deleted/not found, but it still exists")
		}
	})

	t.Run("Get Users List", func(t *testing.T) {
		users, err := userSvc.GetUsers(10, 0, "", "", nil)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}
		if len(users) != 2 { // user2 was deleted
			t.Errorf("expected 2 users left, got %d", len(users))
		}
	})

	t.Run("Change Password Valid", func(t *testing.T) {
		// First set a known password
		user1.SetPassword("OldPassword123!")
		db.Save(user1)

		err := userSvc.ChangePassword(user1.ID, "OldPassword123!", "NewStrongPassword123!")
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}

		// Attempt login with new password logic equivalent
		u, _ := userSvc.GetUserByID(user1.ID)
		if !u.CheckPassword("NewStrongPassword123!") {
			t.Fatal("password was not changed correctly")
		}
	})

	t.Run("Change Password Invalid Old", func(t *testing.T) {
		err := userSvc.ChangePassword(user1.ID, "WrongOldPass", "NewerStrongPassword123!")
		if err == nil {
			t.Fatal("expected error on invalid old password")
		}
	})
}
