package models

import (
	"time"

	"gorm.io/gorm"
)

// BlogPostVersion 定义了博客文章版本历史数据模型
type BlogPostVersion struct {
	ID          uint           `gorm:"primary_key" json:"id"`
	BlogPostID  uint           `gorm:"not null" json:"blog_post_id"`             // 关联的博客文章ID
	BlogPost    BlogPost       `gorm:"foreignKey:BlogPostID" json:"blog_post"`   // 关联的博客文章
	VersionNum  int            `gorm:"not null" json:"version_num"`              // 版本号
	Title       string         `gorm:"not null" json:"title"`                    // 版本标题
	Content     string         `gorm:"type:text;not null" json:"content"`    // 版本内容
	ChangeLog   string         `gorm:"type:text" json:"change_log"`              // 变更日志
	CreatedByID uint           `gorm:"not null" json:"created_by_id"`            // 创建者ID
	CreatedBy   User           `gorm:"foreignKey:CreatedByID" json:"created_by"` // 创建者信息
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BlogPostStats 定义了博客文章统计数据模型
type BlogPostStats struct {
	ID           uint           `gorm:"primary_key" json:"id"`
	BlogPostID   uint           `gorm:"unique;not null" json:"blog_post_id"`    // 关联的博客文章ID
	BlogPost     BlogPost       `gorm:"foreignKey:BlogPostID" json:"blog_post"` // 关联的博客文章
	ViewCount    int            `gorm:"default:0" json:"view_count"`            // 浏览次数
	LikeCount    int            `gorm:"default:0" json:"like_count"`            // 点赞数
	ShareCount   int            `gorm:"default:0" json:"share_count"`           // 分享次数
	CommentCount int            `gorm:"default:0" json:"comment_count"`         // 评论数
	LastViewedAt *time.Time     `json:"last_viewed_at,omitempty"`               // 最后浏览时间
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// BlogPostLike 定义了博客文章点赞记录数据模型
type BlogPostLike struct {
	ID         uint           `gorm:"primary_key" json:"id"`
	BlogPostID uint           `gorm:"not null" json:"blog_post_id"`           // 关联的博客文章ID
	BlogPost   BlogPost       `gorm:"foreignKey:BlogPostID" json:"blog_post"` // 关联的博客文章
	UserID     uint           `gorm:"not null" json:"user_id"`                // 点赞用户ID
	User       User           `gorm:"foreignKey:UserID" json:"user"`          // 点赞用户信息
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (BlogPostLike) TableName() string {
	return "blog_post_likes"
}

// IncrementViewCount 增加浏览次数（原子操作）
func (stats *BlogPostStats) IncrementViewCount(db *gorm.DB) error {
	now := time.Now()
	// 使用 UpdateColumn 避免触发钩子并实现原子增加，解决 SQLite 并发冲突问题
	return db.Model(stats).UpdateColumns(map[string]interface{}{
		"view_count":     gorm.Expr("view_count + ?", 1),
		"last_viewed_at": &now,
		"updated_at":     now,
	}).Error
}

// IncrementLikeCount 增加点赞数（原子操作）
func (stats *BlogPostStats) IncrementLikeCount(db *gorm.DB) error {
	return db.Model(stats).UpdateColumn("like_count", gorm.Expr("like_count + ?", 1)).Error
}

// DecrementLikeCount 减少点赞数（原子操作）
func (stats *BlogPostStats) DecrementLikeCount(db *gorm.DB) error {
	return db.Model(stats).UpdateColumn("like_count", gorm.Expr("CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END")).Error
}

// IncrementShareCount 增加分享次数（原子操作）
func (stats *BlogPostStats) IncrementShareCount(db *gorm.DB) error {
	return db.Model(stats).UpdateColumn("share_count", gorm.Expr("share_count + ?", 1)).Error
}

// CreateBlogPostVersion 创建博客文章版本
func CreateBlogPostVersion(db *gorm.DB, blogPostID uint, userID uint, title, content, changeLog string) (*BlogPostVersion, error) {
	// 获取当前最大版本号
	var maxVersion int
	db.Model(&BlogPostVersion{}).Where("blog_post_id = ?", blogPostID).Select("COALESCE(MAX(version_num), 0)").Scan(&maxVersion)

	version := &BlogPostVersion{
		BlogPostID:  blogPostID,
		VersionNum:  maxVersion + 1,
		Title:       title,
		Content:     content,
		ChangeLog:   changeLog,
		CreatedByID: userID,
	}

	err := db.Create(version).Error
	return version, err
}
