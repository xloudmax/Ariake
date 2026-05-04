package models

import (
	"time"

	"gorm.io/gorm"
)

// BlogPostComment 定义了博客文章评论数据模型
type BlogPostComment struct {
	ID          uint              `gorm:"primary_key" json:"id"`
	Content     string            `gorm:"type:text;not null" json:"content"`            // 评论内容
	BlogPostID  uint              `gorm:"not null" json:"blog_post_id"`                 // 关联的博客文章ID
	BlogPost    BlogPost          `gorm:"foreignKey:BlogPostID" json:"blog_post"`       // 关联的博客文章
	UserID      uint              `gorm:"not null" json:"user_id"`                      // 评论用户ID
	User        User              `gorm:"foreignKey:UserID" json:"user"`                // 评论用户信息
	ParentID    *uint             `gorm:"index" json:"parent_id,omitempty"`             // 父评论ID（用于回复）
	Parent      *BlogPostComment  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`  // 父评论
	Replies     []BlogPostComment `gorm:"foreignKey:ParentID" json:"replies,omitempty"` // 回复列表
	IsApproved  bool              `gorm:"default:true" json:"is_approved"`              // 是否已审核
	LikeCount   int               `gorm:"default:0" json:"like_count"`                  // 点赞数
	ReportCount int               `gorm:"default:0" json:"report_count"`                // 举报数
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`
}

// TableName 指定表名
func (BlogPostComment) TableName() string {
	return "blog_post_comments"
}

// BlogPostCommentLike 定义了博客文章评论点赞记录数据模型
type BlogPostCommentLike struct {
	ID                uint            `gorm:"primary_key" json:"id"`
	BlogPostCommentID uint            `gorm:"not null" json:"blog_post_comment_id"`                  // 关联的评论ID
	BlogPostComment   BlogPostComment `gorm:"foreignKey:BlogPostCommentID" json:"blog_post_comment"` // 关联的评论
	UserID            uint            `gorm:"not null" json:"user_id"`                               // 点赞用户ID
	User              User            `gorm:"foreignKey:UserID" json:"user"`                         // 点赞用户信息
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	DeletedAt         gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName 指定表名
func (BlogPostCommentLike) TableName() string {
	return "blog_post_comment_likes"
}

// IncrementLikeCount 增加评论点赞数
func (comment *BlogPostComment) IncrementLikeCount(db *gorm.DB) error {
	comment.LikeCount++
	return db.Save(comment).Error
}

// DecrementLikeCount 减少评论点赞数
func (comment *BlogPostComment) DecrementLikeCount(db *gorm.DB) error {
	if comment.LikeCount > 0 {
		comment.LikeCount--
	}
	return db.Save(comment).Error
}

// IncrementReportCount 增加评论举报数
func (comment *BlogPostComment) IncrementReportCount(db *gorm.DB) error {
	comment.ReportCount++
	return db.Save(comment).Error
}
