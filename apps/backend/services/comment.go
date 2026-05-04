package services

import (
	"errors"
	"repair-platform/middleware"
	"repair-platform/models"

	"gorm.io/gorm"
)

// CommentService 评论服务
type CommentService struct {
	db *gorm.DB
}

// NewCommentService 创建评论服务实例
func NewCommentService(db *gorm.DB) *CommentService {
	return &CommentService{db: db}
}

// CreateComment 创建评论
func (s *CommentService) CreateComment(input *CreateCommentInput, userID uint) (*models.BlogPostComment, error) {
	logger := middleware.GetLogger()

	// 检查博客文章是否存在
	var post models.BlogPost
	if err := s.db.Where("id = ? AND status = 'PUBLISHED'", input.BlogPostID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("文章不存在或未发布")
		}
		return nil, err
	}

	// 检查父评论是否存在（如果是回复）
	var parentComment *models.BlogPostComment
	if input.ParentID != nil {
		var pc models.BlogPostComment
		if err := s.db.Where("id = ? AND blog_post_id = ?", *input.ParentID, input.BlogPostID).First(&pc).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("回复的评论不存在")
			}
			return nil, err
		}
		parentComment = &pc
	}

	// 创建评论
	comment := &models.BlogPostComment{
		Content:    input.Content,
		BlogPostID: input.BlogPostID,
		UserID:     userID,
		ParentID:   input.ParentID,
		IsApproved: true, // 默认审核通过
	}

	// 如果是回复评论，记录日志
	if parentComment != nil {
		logger.Infow("回复评论", "parentCommentID", parentComment.ID, "postID", input.BlogPostID, "userID", userID)
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 保存评论
	if err := tx.Create(comment).Error; err != nil {
		tx.Rollback()
		logger.Errorw("创建评论失败", "error", err)
		return nil, err
	}

	// 更新文章统计信息
	if err := tx.Model(&models.BlogPostStats{}).Where("blog_post_id = ?", input.BlogPostID).UpdateColumn("comment_count", gorm.Expr("comment_count + ?", 1)).Error; err != nil {
		tx.Rollback()
		logger.Errorw("更新文章评论数失败", "error", err)
		return nil, err
	}

	tx.Commit()

	// 预加载关联数据
	if err := s.db.Preload("User").Preload("BlogPost").Preload("Parent").Preload("Parent.User").First(&comment, comment.ID).Error; err != nil {
		return comment, nil // 即使预加载失败也返回评论
	}

	logger.Infow("创建评论成功", "commentID", comment.ID, "postID", input.BlogPostID, "userID", userID)
	return comment, nil
}

// GetCommentsByPostID 获取文章的评论列表
func (s *CommentService) GetCommentsByPostID(postID uint, limit, offset int) ([]*models.BlogPostComment, int64, error) {
	// 获取总数
	var total int64
	if err := s.db.Model(&models.BlogPostComment{}).Where("blog_post_id = ? AND is_approved = ?", postID, true).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取评论列表
	var comments []*models.BlogPostComment
	err := s.db.
		Preload("User").
		Preload("Parent").
		Preload("Parent.User").
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User").Limit(5) // 限制每个评论的回复数
		}).
		Where("blog_post_id = ? AND is_approved = ? AND parent_id IS NULL", postID, true).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&comments).Error

	if err != nil {
		return nil, 0, err
	}

	return comments, total, nil
}

// GetCommentByID 根据ID获取评论
func (s *CommentService) GetCommentByID(commentID uint) (*models.BlogPostComment, error) {
	var comment models.BlogPostComment
	err := s.db.
		Preload("User").
		Preload("Parent").
		Preload("Parent.User").
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User")
		}).
		Where("id = ? AND is_approved = ?", commentID, true).
		First(&comment).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在或未审核")
		}
		return nil, err
	}

	return &comment, nil
}

// UpdateComment 更新评论
func (s *CommentService) UpdateComment(commentID uint, content string, userID uint, userRole string) (*models.BlogPostComment, error) {
	// 查找评论
	var comment models.BlogPostComment
	if err := s.db.First(&comment, commentID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在")
		}
		return nil, err
	}

	// 检查权限（评论作者或管理员）
	if comment.UserID != userID && userRole != "ADMIN" {
		return nil, errors.New("无权限修改此评论")
	}

	// 更新评论内容
	comment.Content = content
	if err := s.db.Save(&comment).Error; err != nil {
		return nil, err
	}

	// 预加载关联数据
	if err := s.db.Preload("User").Preload("Parent").Preload("Parent.User").First(&comment, comment.ID).Error; err != nil {
		return &comment, nil // 即使预加载失败也返回评论
	}

	return &comment, nil
}

// DeleteComment 删除评论（递归删除所有子评论）
func (s *CommentService) DeleteComment(commentID uint, userID uint, userRole string) error {
	// 查找评论
	var comment models.BlogPostComment
	if err := s.db.First(&comment, commentID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("评论不存在")
		}
		return err
	}

	// 检查权限（评论作者或管理员）
	if comment.UserID != userID && userRole != "ADMIN" {
		return errors.New("无权限删除此评论")
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 收集所有需要删除的评论ID（包括所有后代，防止孤儿数据）
	idsToDelete := []uint{commentID}
	currentLevelIDs := []uint{commentID}

	// 循环查找所有下级回复
	for len(currentLevelIDs) > 0 {
		var childrenIDs []uint
		if err := tx.Model(&models.BlogPostComment{}).Where("parent_id IN ?", currentLevelIDs).Pluck("id", &childrenIDs).Error; err != nil {
			tx.Rollback()
			return err
		}
		if len(childrenIDs) > 0 {
			idsToDelete = append(idsToDelete, childrenIDs...)
			currentLevelIDs = childrenIDs
		} else {
			currentLevelIDs = nil
		}
	}

	// 批量删除评论
	result := tx.Delete(&models.BlogPostComment{}, idsToDelete)
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}

	// 更新文章统计信息 (减去实际删除的评论数量)
	if err := tx.Model(&models.BlogPostStats{}).
		Where("blog_post_id = ?", comment.BlogPostID).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", result.RowsAffected)).Error; err != nil {
		tx.Rollback()
		return err
	}

	tx.Commit()

	return nil
}

// LikeComment 点赞评论
func (s *CommentService) LikeComment(commentID uint, userID uint) (*models.BlogPostComment, error) {
	// 查找评论
	var comment models.BlogPostComment
	if err := s.db.First(&comment, commentID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在")
		}
		return nil, err
	}

	// 检查是否已经点赞
	var existingLike models.BlogPostCommentLike
	if err := s.db.Where("blog_post_comment_id = ? AND user_id = ?", commentID, userID).First(&existingLike).Error; err == nil {
		return nil, errors.New("已经点赞过了")
	}

	// 在事务中处理点赞
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 创建点赞记录
	like := &models.BlogPostCommentLike{
		BlogPostCommentID: commentID,
		UserID:            userID,
	}
	if err := tx.Create(like).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 更新点赞数
	if err := comment.IncrementLikeCount(tx); err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 重新加载完整数据
	if err := s.db.Preload("User").First(&comment, commentID).Error; err != nil {
		return &comment, nil // 即使预加载失败也返回评论
	}

	return &comment, nil
}

// UnlikeComment 取消点赞评论
func (s *CommentService) UnlikeComment(commentID uint, userID uint) (*models.BlogPostComment, error) {
	// 查找评论
	var comment models.BlogPostComment
	if err := s.db.Preload("User").First(&comment, commentID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在")
		}
		return nil, err
	}

	// 查找点赞记录
	var like models.BlogPostCommentLike
	if err := s.db.Where("blog_post_comment_id = ? AND user_id = ?", commentID, userID).First(&like).Error; err != nil {
		return nil, errors.New("尚未点赞")
	}

	// 在事务中处理取消点赞
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除点赞记录
	if err := tx.Delete(&like).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 更新点赞数
	if err := comment.DecrementLikeCount(tx); err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 重新加载完整数据
	if err := s.db.Preload("User").First(&comment, commentID).Error; err != nil {
		return &comment, nil // 即使预加载失败也返回评论
	}

	return &comment, nil
}

// ReportComment 举报评论
func (s *CommentService) ReportComment(commentID uint, userID uint) (*models.BlogPostComment, error) {
	// 查找评论
	var comment models.BlogPostComment
	if err := s.db.First(&comment, commentID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在")
		}
		return nil, err
	}

	// 更新举报数
	if err := comment.IncrementReportCount(s.db); err != nil {
		return nil, err
	}

	// 如果举报数超过阈值，自动标记为未审核
	if comment.ReportCount >= 5 {
		comment.IsApproved = false
		if err := s.db.Save(&comment).Error; err != nil {
			return nil, err
		}
	}

	// 重新加载完整数据
	if err := s.db.Preload("User").First(&comment, commentID).Error; err != nil {
		return &comment, nil // 即使预加载失败也返回评论
	}

	return &comment, nil
}

// CreateCommentInput 创建评论的输入结构体
type CreateCommentInput struct {
	Content    string `json:"content" binding:"required"`
	BlogPostID uint   `json:"blog_post_id" binding:"required"`
	ParentID   *uint  `json:"parent_id,omitempty"`
}
