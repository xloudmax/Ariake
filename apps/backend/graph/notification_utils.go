package graph

import (
	"repair-platform/models"
	"strconv"
)

// convertToGraphQLNotification 转换数据库通知模型为 GraphQL 通知类型
func convertToGraphQLNotification(notification *models.Notification) *Notification {
	if notification == nil {
		return nil
	}

	// 转换通知类型枚举
	var notificationType NotificationType
	switch notification.Type {
	case models.NotificationTypeCommentReply:
		notificationType = NotificationTypeCommentReply
	case models.NotificationTypePostLike:
		notificationType = NotificationTypePostLike
	case models.NotificationTypePostComment:
		notificationType = NotificationTypePostComment
	case models.NotificationTypeSystem:
		notificationType = NotificationTypeSystem
	default:
		notificationType = NotificationTypeSystem
	}

	// 转换关联的文章（可选）
	var relatedPost *BlogPost
	if notification.RelatedPost != nil && notification.RelatedPost.ID != 0 {
		relatedPost = convertToGraphQLBlogPost(notification.RelatedPost)
	}

	// 转换关联的评论（可选）
	var relatedComment *BlogPostComment
	if notification.RelatedComment != nil && notification.RelatedComment.ID != 0 {
		relatedComment = convertToGraphQLComment(notification.RelatedComment)
	}

	// 转换关联的用户（可选）
	var relatedUser *User
	if notification.RelatedUser != nil && notification.RelatedUser.ID != 0 {
		relatedUser = convertToGraphQLUser(notification.RelatedUser)
	}

	// 转换接收者（必需）
	var recipient *User
	if notification.Recipient.ID != 0 {
		recipient = convertToGraphQLUser(&notification.Recipient)
	} else {
		// 如果预加载失败，创建一个最小的 User 对象以满足 GraphQL 要求
		recipient = &User{
			ID:         strconv.FormatUint(uint64(notification.RecipientID), 10),
			Username:   "Unknown User",
			Email:      "",
			Role:       UserRoleUser,
			IsVerified: false,
			IsActive:   true,
			CreatedAt:  notification.CreatedAt,
			UpdatedAt:  notification.UpdatedAt,
		}
	}

	return &Notification{
		ID:             strconv.FormatUint(uint64(notification.ID), 10),
		Type:           notificationType,
		Title:          notification.Title,
		Content:        notification.Content,
		RelatedPost:    relatedPost,
		RelatedComment: relatedComment,
		RelatedUser:    relatedUser,
		Recipient:      recipient,
		IsRead:         notification.IsRead,
		CreatedAt:      notification.CreatedAt,
	}
}
