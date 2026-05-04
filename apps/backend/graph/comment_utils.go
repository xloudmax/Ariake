package graph

import (
	"repair-platform/models"
	"strconv"
)

// convertToGraphQLComment 转换数据库评论模型为 GraphQL 评论类型
func convertToGraphQLComment(comment *models.BlogPostComment) *BlogPostComment {
	if comment == nil {
		return nil
	}

	// 确保 BlogPost 字段不为 nil（必需字段）
	var blogPost *BlogPost
	if comment.BlogPost.ID != 0 {
		blogPost = convertToGraphQLBlogPost(&comment.BlogPost)
	} else {
		// 如果预加载失败，创建一个最小的 BlogPost 对象以满足 GraphQL 要求
		blogPost = &BlogPost{
			ID:          strconv.FormatUint(uint64(comment.BlogPostID), 10),
			Title:       "Loading...",
			Slug:        "",
			Content:     "",
			Tags:        []string{},
			Categories:  []string{},
			AccessLevel: AccessLevelPublic,
			Status:      PostStatusPublished,
			CreatedAt:   comment.CreatedAt,
			UpdatedAt:   comment.UpdatedAt,
			Author:      &User{ID: "0", Username: "Unknown", Email: "", Role: UserRoleUser, IsVerified: false, IsActive: true, CreatedAt: comment.CreatedAt, UpdatedAt: comment.UpdatedAt},
			Stats:       &BlogPostStats{ID: strconv.FormatUint(uint64(comment.BlogPostID), 10), ViewCount: 0, LikeCount: 0, ShareCount: 0, CommentCount: 0, UpdatedAt: &comment.UpdatedAt},
			IsLiked:     false,
		}
	}

	// 确保 User 字段不为 nil（必需字段）
	var user *User
	if comment.User.ID != 0 {
		user = convertToGraphQLUser(&comment.User)
	} else {
		// 如果预加载失败，创建一个最小的 User 对象以满足 GraphQL 要求
		user = &User{
			ID:         strconv.FormatUint(uint64(comment.UserID), 10),
			Username:   "Unknown User",
			Email:      "",
			Role:       UserRoleUser,
			IsVerified: false,
			IsActive:   true,
			CreatedAt:  comment.CreatedAt,
			UpdatedAt:  comment.UpdatedAt,
		}
	}

	return &BlogPostComment{
		ID:          strconv.FormatUint(uint64(comment.ID), 10),
		Content:     comment.Content,
		BlogPost:    blogPost,
		User:        user,
		Parent:      convertToGraphQLComment(comment.Parent),
		Replies:     convertToGraphQLCommentSlice(comment.Replies),
		IsApproved:  comment.IsApproved,
		LikeCount:   comment.LikeCount,
		ReportCount: comment.ReportCount,
		CreatedAt:   comment.CreatedAt,
		UpdatedAt:   comment.UpdatedAt,
	}
}

// convertToGraphQLCommentSlice 转换数据库评论模型切片为 GraphQL 评论类型切片
func convertToGraphQLCommentSlice(comments []models.BlogPostComment) []*BlogPostComment {
	if comments == nil {
		return nil
	}

	result := make([]*BlogPostComment, len(comments))
	for i, comment := range comments {
		result[i] = convertToGraphQLComment(&comment)
	}
	return result
}
