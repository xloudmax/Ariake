package models

import (
	"time"

	"gorm.io/gorm"
)

// NotificationType 定义通知类型枚举
type NotificationType string

const (
	NotificationTypeCommentReply NotificationType = "COMMENT_REPLY" // 评论回复
	NotificationTypePostLike     NotificationType = "POST_LIKE"     // 文章点赞
	NotificationTypePostComment  NotificationType = "POST_COMMENT"  // 文章评论
	NotificationTypeSystem       NotificationType = "SYSTEM"        // 系统通知
)

// Notification 定义了通知数据模型
type Notification struct {
	ID               uint             `gorm:"primary_key" json:"id"`
	Type             NotificationType `gorm:"type:varchar(50);not null" json:"type"`                        // 通知类型
	Title            string           `gorm:"type:varchar(255);not null" json:"title"`                      // 通知标题
	Content          string           `gorm:"type:text;not null" json:"content"`                            // 通知内容
	RelatedPostID    *uint            `gorm:"index" json:"related_post_id,omitempty"`                       // 关联文章ID（可选）
	RelatedPost      *BlogPost        `gorm:"foreignKey:RelatedPostID" json:"related_post,omitempty"`       // 关联文章
	RelatedCommentID *uint            `gorm:"index" json:"related_comment_id,omitempty"`                    // 关联评论ID（可选）
	RelatedComment   *BlogPostComment `gorm:"foreignKey:RelatedCommentID" json:"related_comment,omitempty"` // 关联评论
	RelatedUserID    *uint            `gorm:"index" json:"related_user_id,omitempty"`                       // 触发通知的用户ID（可选）
	RelatedUser      *User            `gorm:"foreignKey:RelatedUserID" json:"related_user,omitempty"`       // 触发通知的用户
	RecipientID      uint             `gorm:"not null;index" json:"recipient_id"`                           // 接收者用户ID
	Recipient        User             `gorm:"foreignKey:RecipientID" json:"recipient"`                      // 接收者用户信息
	IsRead           bool             `gorm:"default:false" json:"is_read"`                                 // 是否已读
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
	DeletedAt        gorm.DeletedAt   `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Notification) TableName() string {
	return "notifications"
}

// MarkAsRead 标记通知为已读
func (notification *Notification) MarkAsRead(db *gorm.DB) error {
	notification.IsRead = true
	return db.Save(notification).Error
}

// CreateNotification 创建新通知的辅助函数
func CreateNotification(db *gorm.DB, notificationType NotificationType, title, content string, recipientID uint, relatedPostID, relatedCommentID, relatedUserID *uint) (*Notification, error) {
	notification := &Notification{
		Type:             notificationType,
		Title:            title,
		Content:          content,
		RecipientID:      recipientID,
		RelatedPostID:    relatedPostID,
		RelatedCommentID: relatedCommentID,
		RelatedUserID:    relatedUserID,
		IsRead:           false,
	}

	if err := db.Create(notification).Error; err != nil {
		return nil, err
	}

	return notification, nil
}

// GetUnreadCount 获取用户未读通知数量
func GetUnreadNotificationCount(db *gorm.DB, userID uint) (int64, error) {
	var count int64
	err := db.Model(&Notification{}).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

// MarkAllAsReadForUser 标记用户的所有通知为已读
func MarkAllNotificationsAsReadForUser(db *gorm.DB, userID uint) error {
	return db.Model(&Notification{}).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}
