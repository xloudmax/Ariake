package services

import (
	"errors"
	"fmt"
	"repair-platform/middleware"
	"repair-platform/models"
	"repair-platform/utils"

	"gorm.io/gorm"
)

// NotificationService 通知服务
type NotificationService struct {
	db *gorm.DB
}

// NewNotificationService 创建通知服务实例
func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

// GetNotifications 获取用户的通知列表
func (s *NotificationService) GetNotifications(userID uint, limit, offset int) ([]*models.Notification, int64, error) {
	// 获取总数
	var total int64
	if err := s.db.Model(&models.Notification{}).Where("recipient_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取通知列表
	var notifications []*models.Notification
	err := s.db.
		Preload("RelatedPost").
		Preload("RelatedPost.Author").
		Preload("RelatedComment").
		Preload("RelatedComment.User").
		Preload("RelatedUser").
		Preload("Recipient").
		Where("recipient_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error

	if err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetUnreadNotificationCount 获取用户未读通知数量
func (s *NotificationService) GetUnreadNotificationCount(userID uint) (int64, error) {
	return models.GetUnreadNotificationCount(s.db, userID)
}

// MarkNotificationAsRead 标记通知为已读
func (s *NotificationService) MarkNotificationAsRead(notificationID uint, userID uint) (*models.Notification, error) {
	logger := middleware.GetLogger()

	// 查找通知
	var notification models.Notification
	if err := s.db.First(&notification, notificationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("通知不存在")
		}
		return nil, err
	}

	// 检查权限（只能操作自己的通知）
	if notification.RecipientID != userID {
		return nil, errors.New("无权限操作此通知")
	}

	// 如果已经是已读状态，直接返回
	if notification.IsRead {
		return &notification, nil
	}

	// 标记为已读
	if err := notification.MarkAsRead(s.db); err != nil {
		logger.Errorw("标记通知为已读失败", "error", err, "notificationID", notificationID)
		return nil, err
	}

	// 预加载关联数据
	if err := s.db.
		Preload("RelatedPost").
		Preload("RelatedPost.Author").
		Preload("RelatedComment").
		Preload("RelatedComment.User").
		Preload("RelatedUser").
		Preload("Recipient").
		First(&notification, notification.ID).Error; err != nil {
		return &notification, nil // 即使预加载失败也返回通知
	}

	logger.Infow("标记通知为已读", "notificationID", notificationID, "userID", userID)
	return &notification, nil
}

// MarkAllNotificationsAsRead 标记用户的所有通知为已读
func (s *NotificationService) MarkAllNotificationsAsRead(userID uint) error {
	logger := middleware.GetLogger()

	if err := models.MarkAllNotificationsAsReadForUser(s.db, userID); err != nil {
		logger.Errorw("标记所有通知为已读失败", "error", err, "userID", userID)
		return err
	}

	logger.Infow("标记所有通知为已读", "userID", userID)
	return nil
}

// DeleteNotification 删除通知
func (s *NotificationService) DeleteNotification(notificationID uint, userID uint) error {
	logger := middleware.GetLogger()

	// 查找通知
	var notification models.Notification
	if err := s.db.First(&notification, notificationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("通知不存在")
		}
		return err
	}

	// 检查权限（只能删除自己的通知）
	if notification.RecipientID != userID {
		return errors.New("无权限删除此通知")
	}

	// 删除通知
	if err := s.db.Delete(&notification).Error; err != nil {
		logger.Errorw("删除通知失败", "error", err, "notificationID", notificationID)
		return err
	}

	logger.Infow("删除通知成功", "notificationID", notificationID, "userID", userID)
	return nil
}

// ClearAllNotifications 清空用户的所有通知
func (s *NotificationService) ClearAllNotifications(userID uint) error {
	logger := middleware.GetLogger()

	if err := s.db.Where("recipient_id = ?", userID).Delete(&models.Notification{}).Error; err != nil {
		logger.Errorw("清空所有通知失败", "error", err, "userID", userID)
		return err
	}

	logger.Infow("清空所有通知成功", "userID", userID)
	return nil
}

// CreateNotification 创建通知（内部使用）
func (s *NotificationService) CreateNotification(notificationType models.NotificationType, title, content string, recipientID uint, relatedPostID, relatedCommentID, relatedUserID *uint) (*models.Notification, error) {
	logger := middleware.GetLogger()

	notification, err := models.CreateNotification(
		s.db,
		notificationType,
		title,
		content,
		recipientID,
		relatedPostID,
		relatedCommentID,
		relatedUserID,
	)

	if err != nil {
		logger.Errorw("创建通知失败", "error", err, "type", notificationType, "recipientID", recipientID)
		return nil, err
	}

	logger.Infow("创建通知成功", "notificationID", notification.ID, "type", notificationType, "recipientID", recipientID)
	return notification, nil
}

// NotifyPostLike 创建文章点赞通知
func (s *NotificationService) NotifyPostLike(postID uint, postTitle string, postAuthorID uint, likerID uint, likerUsername string) error {
	// 不给自己发通知
	if postAuthorID == likerID {
		return nil
	}

	title := "文章获得点赞"
	content := fmt.Sprintf("%s 赞了你的文章「%s」", likerUsername, postTitle)

	_, err := s.CreateNotification(
		models.NotificationTypePostLike,
		title,
		content,
		postAuthorID,
		&postID,
		nil,
		&likerID,
	)

	return err
}

// NotifyPostComment 创建文章评论通知
func (s *NotificationService) NotifyPostComment(postID uint, postTitle string, postAuthorID uint, commentID uint, commenterID uint, commenterUsername string, commentContent string) error {
	// 不给自己发通知
	if postAuthorID == commenterID {
		return nil
	}

	title := "文章收到新评论"
	content := fmt.Sprintf("%s 评论了你的文章「%s」: %s", commenterUsername, postTitle, commentContent)

	// 限制内容长度 (Runes-aware)
	content = utils.TruncateStringWithEllipsis(content, 100)

	_, err := s.CreateNotification(
		models.NotificationTypePostComment,
		title,
		content,
		postAuthorID,
		&postID,
		&commentID,
		&commenterID,
	)

	return err
}

// NotifyCommentReply 创建评论回复通知
func (s *NotificationService) NotifyCommentReply(postID uint, postTitle string, parentCommentID uint, parentCommentAuthorID uint, replyID uint, replierID uint, replierUsername string, replyContent string) error {
	// 不给自己发通知
	if parentCommentAuthorID == replierID {
		return nil
	}

	title := "评论收到回复"
	content := fmt.Sprintf("%s 回复了你在「%s」下的评论: %s", replierUsername, postTitle, replyContent)

	// 限制内容长度 (Runes-aware)
	content = utils.TruncateStringWithEllipsis(content, 100)

	_, err := s.CreateNotification(
		models.NotificationTypeCommentReply,
		title,
		content,
		parentCommentAuthorID,
		&postID,
		&replyID,
		&replierID,
	)

	return err
}

// CreateSystemNotification 创建系统通知
func (s *NotificationService) CreateSystemNotification(title, content string, recipientID uint) error {
	_, err := s.CreateNotification(
		models.NotificationTypeSystem,
		title,
		content,
		recipientID,
		nil,
		nil,
		nil,
	)

	return err
}
