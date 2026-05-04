package services

import (
	"testing"
	"time"

	"repair-platform/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func setupNotifDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.Notification{}, &models.User{}, &models.BlogPost{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestNotificationServiceCRUD(t *testing.T) {
	db := setupNotifDB(t)
	user := models.User{Username: "u1", Email: "u1@example.com", IsVerified: true, Role: "USER"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	svc := NewNotificationService(db)
	n, err := svc.CreateNotification(models.NotificationTypeSystem, "hi", "test", user.ID, nil, nil, nil)
	if err != nil {
		t.Fatalf("create notification: %v", err)
	}

	list, total, err := svc.GetNotifications(user.ID, 10, 0)
	if err != nil || total != 1 || len(list) != 1 {
		t.Fatalf("expected one notification, got total=%d len=%d err=%v", total, len(list), err)
	}

	if _, err := svc.MarkNotificationAsRead(n.ID, user.ID); err != nil {
		t.Fatalf("mark read: %v", err)
	}

	if err := svc.MarkAllNotificationsAsRead(user.ID); err != nil {
		t.Fatalf("mark all read: %v", err)
	}
	count, err := svc.GetUnreadNotificationCount(user.ID)
	if err != nil || count != 0 {
		t.Fatalf("expected unread count 0, got %d err=%v", count, err)
	}

	if err := svc.DeleteNotification(n.ID, user.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestNotificationExpiryFields(t *testing.T) {
	db := setupNotifDB(t)
	user := models.User{Username: "u2", Email: "u2@example.com", IsVerified: true, Role: "USER"}
	db.Create(&user)

	svc := NewNotificationService(db)
	n, err := svc.CreateNotification(models.NotificationTypeSystem, "hi", "test", user.ID, nil, nil, nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if n.CreatedAt.After(time.Now()) {
		t.Fatalf("unexpected createdAt")
	}
}
