package graph

import (
	"context"

	"errors"
	"fmt"
	"repair-platform/models"
	"repair-platform/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 定义 Context Key 类型以避免冲突 (SA1029)
type ContextKey string

const GinContextKey ContextKey = "GinContext"

// GraphQLError 标准 GraphQL 错误结构
type GraphQLError struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

func (e GraphQLError) Error() string {
	return e.Message
}

// 常用错误定义
var (
	ErrUnauthorized       = GraphQLError{Message: "未授权访问", Code: "UNAUTHORIZED"}
	ErrForbidden          = GraphQLError{Message: "权限不足", Code: "FORBIDDEN"}
	ErrInvalidInput       = GraphQLError{Message: "输入参数无效", Code: "INVALID_INPUT"}
	ErrUserNotFound       = GraphQLError{Message: "用户不存在", Code: "USER_NOT_FOUND"}
	ErrUserExists         = GraphQLError{Message: "用户已存在", Code: "USER_EXISTS"}
	ErrInvalidCredentials = GraphQLError{Message: "用户名或密码错误", Code: "INVALID_CREDENTIALS"}
	ErrEmailNotVerified   = GraphQLError{Message: "邮箱未验证", Code: "EMAIL_NOT_VERIFIED"}
	ErrInternalError      = GraphQLError{Message: "服务器内部错误", Code: "INTERNAL_ERROR"}
)

// getUserFromContext 从上下文中获取当前用户信息
func getUserFromContext(ctx context.Context, db *gorm.DB) (*models.User, error) {
	// 尝试从 Gin 上下文中获取用户信息（通过HTTP请求）
	if ginCtx := getGinContext(ctx); ginCtx != nil {
		if userID, exists := ginCtx.Get("user_id"); exists {
			if id, ok := userID.(uint); ok {
				var user models.User
				if err := db.First(&user, id).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return nil, ErrUserNotFound
					}
					return nil, fmt.Errorf("数据库查询错误: %w", err)
				}
				return &user, nil
			}
			return nil, fmt.Errorf("用户ID类型错误")
		}
		// 如果Gin上下文中没有user_id，尝试获取username
		if username, exists := ginCtx.Get("username"); exists {
			if name, ok := username.(string); ok {
				var user models.User
				if err := db.Where("username = ?", name).First(&user).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return nil, ErrUserNotFound
					}
					return nil, fmt.Errorf("数据库查询错误: %w", err)
				}
				return &user, nil
			}
			return nil, fmt.Errorf("用户名类型错误")
		}
		return nil, ErrUnauthorized
	}

	// 回退到原来的逻辑（用于直接GraphQL上下文）
	username, ok := ctx.Value("username").(string)
	if !ok {
		return nil, ErrUnauthorized
	}

	var user models.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("数据库查询错误: %w", err)
	}

	return &user, nil
}

// getGinContext 从GraphQL上下文中获取Gin上下文
func getGinContext(ctx context.Context) *gin.Context {
	// 从路由中注入的Gin上下文 (使用自定义 Key)
	if ginCtx, ok := ctx.Value(GinContextKey).(*gin.Context); ok {
		return ginCtx
	}

	// 兼容旧的字符串 Key (如果还有其他地方在使用但未更新)
	if ginCtx, ok := ctx.Value("GinContext").(*gin.Context); ok {
		return ginCtx
	}

	// 其他尝试方式（向后兼容）
	if ginCtx, ok := ctx.Value("GinContextKey").(*gin.Context); ok {
		return ginCtx
	}

	// 尝试通过类型断言获取
	if ginCtx, ok := ctx.(*gin.Context); ok {
		return ginCtx
	}

	return nil
}

// convertToGraphQLUser 转换数据库用户模型为 GraphQL 用户类型
func convertToGraphQLUser(user *models.User) *User {
	if user == nil {
		return nil
	}

	var role UserRole
	switch user.Role {
	case "ADMIN":
		role = UserRoleAdmin
	default:
		role = UserRoleUser
	}

	// Convert string fields to string pointers if not empty
	var bio *string
	if user.Bio != "" {
		bio = &user.Bio
	}

	var avatar *string
	if user.Avatar != "" {
		avatar = &user.Avatar
	}

	var lastLoginAt *time.Time
	if user.LastLoginAt != nil {
		lastLoginAt = user.LastLoginAt
	}

	return &User{
		ID:          strconv.FormatUint(uint64(user.ID), 10),
		Username:    user.Username,
		Email:       user.Email,
		Role:        role,
		IsVerified:  user.IsVerified,
		IsActive:    user.IsActive,
		Bio:         bio,
		Avatar:      avatar,
		LastLoginAt: lastLoginAt,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
}

// strPtr 返回字符串指针
func strPtr(s string) *string {
	return &s
}

// requireAdmin 验证管理员权限
func requireAdmin(ctx context.Context, db *gorm.DB) (*models.User, error) {
	user, err := getUserFromContext(ctx, db)
	if err != nil {
		return nil, err
	}
	if user.Role != "ADMIN" {
		return nil, ErrForbidden
	}
	return user, nil
}

// requireVerified 验证已登录且邮箱已验证
func requireVerified(ctx context.Context, db *gorm.DB) (*models.User, error) {
	user, err := getUserFromContext(ctx, db)
	if err != nil {
		return nil, err
	}
	if !user.IsVerified {
		return nil, ErrEmailNotVerified
	}
	return user, nil
}

// requireVerifiedSafe 包装错误信息
func requireVerifiedSafe(ctx context.Context, db *gorm.DB) (*models.User, error) {
	user, err := requireVerified(ctx, db)
	if err != nil {
		return nil, HandleAuthError(err)
	}
	return user, nil
}



// verifyCode 验证验证码
func verifyCode(email, code, codeType string) bool {
	ev := models.GetEmailVerificationService()
	if ev == nil {
		return false
	}
	return ev.VerifyCode(email, code, codeType)
}

// deleteVerificationCode 删除验证码
func deleteVerificationCode(email, codeType string) {
	ev := models.GetEmailVerificationService()
	if ev == nil {
		return
	}
	ev.InvalidateCode(email, codeType)
}

// parseID 解析字符串 ID 为 uint
func parseID(id string) (uint, error) {
	// 尝试通过全局解析器解析
	idInfo, err := utils.ParseID(id)
	if err == nil && idInfo.Type == utils.IDTypeNumeric {
		return uint(idInfo.NumericValue), nil
	}

	// 如果不是数字 ID，但可能是 Slug（在某些场景下需要原样返回或忽略）
	// 此处保持向后兼容，如果确实需要数字但解析失败，则报错
	parsed, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("无效的数字ID格式: %s (%w)", id, ErrInvalidInput)
	}
	return uint(parsed), nil
}

// convertToGraphQLBlogPost 转换数据库博客模型为 GraphQL 博客类型
func convertToGraphQLBlogPost(post *models.BlogPost) *BlogPost {
	return convertToGraphQLBlogPostWithUser(post, nil)
}

// convertToGraphQLBlogPostWithUser 转换数据库博客模型为 GraphQL 博客类型，支持用户特定信息
func convertToGraphQLBlogPostWithUser(post *models.BlogPost, currentUser *models.User) *BlogPost {
	// 转换访问级别
	var accessLevel AccessLevel
	switch post.AccessLevel {
	case "PRIVATE":
		accessLevel = AccessLevelPrivate
	case "RESTRICTED":
		accessLevel = AccessLevelRestricted
	default:
		accessLevel = AccessLevelPublic
	}

	// 转换状态
	var status PostStatus
	switch post.Status {
	case "DRAFT":
		status = PostStatusDraft
	case "ARCHIVED":
		status = PostStatusArchived
	default:
		status = PostStatusPublished
	}

	// 处理标签和分类
	tags := []string{}
	// 优先使用关联列表
	if len(post.TagsList) > 0 {
		for _, t := range post.TagsList {
			tags = append(tags, t.Name)
		}
	} else if post.Tags != "" {
		// 回退到旧字符串字段
		splitTags := strings.Split(post.Tags, ",")
		for _, tag := range splitTags {
			tags = append(tags, strings.TrimSpace(tag))
		}
	}

	categories := []string{}
	// 优先使用关联列表
	if len(post.CategoriesList) > 0 {
		for _, c := range post.CategoriesList {
			categories = append(categories, c.Name)
		}
	} else if post.Categories != "" {
		// 回退到旧字符串字段
		splitCats := strings.Split(post.Categories, ",")
		for _, cat := range splitCats {
			categories = append(categories, strings.TrimSpace(cat))
		}
	}

	// 直接使用数据库中的内容
	content := post.Content

	// 处理封面图片 URL
	var coverImageURL *string
	if post.CoverImageURL != "" {
		coverImageURL = &post.CoverImageURL
	}

	// 处理摘录
	var excerpt *string
	if post.Excerpt != "" {
		excerpt = &post.Excerpt
	}

	// 转换统计信息，确保stats总是存在
	var stats *BlogPostStats
	if post.Stats != nil && post.Stats.ID != 0 {
		sUpdatedAt := post.Stats.UpdatedAt
		if sUpdatedAt.IsZero() {
			sUpdatedAt = post.Stats.CreatedAt
			if sUpdatedAt.IsZero() {
				sUpdatedAt = post.CreatedAt // 回退到文章创建时间
				if sUpdatedAt.IsZero() {
					sUpdatedAt = time.Now()
				}
			}
		}

		stats = &BlogPostStats{
			ID:           strconv.FormatUint(uint64(post.Stats.ID), 10),
			ViewCount:    post.Stats.ViewCount,
			LikeCount:    post.Stats.LikeCount,
			ShareCount:   post.Stats.ShareCount,
			CommentCount: post.Stats.CommentCount,
			LastViewedAt: post.Stats.LastViewedAt,
			UpdatedAt:    &sUpdatedAt,
		}
	} else {
		// 返回默认统计以避免 GraphQL 非空约束报错
		now := time.Now()
		stats = &BlogPostStats{
			ID:           strconv.FormatUint(uint64(post.ID), 10) + "_stats",
			ViewCount:    0,
			LikeCount:    0,
			ShareCount:   0,
			CommentCount: 0,
			UpdatedAt:    &now,
		}
	}

	// 默认isLiked为false
	isLiked := false

	// 处理 Author
	var author *User
	if post.Author.ID != 0 {
		author = convertToGraphQLUser(&post.Author)
	} else {
		// 返回幽灵作者以满足 GraphQL 非空约束
		author = &User{
			ID:       "0",
			Username: "Ghost",
			Email:    "ghost@c404.cc",
			Role:     UserRoleUser,
		}
	}

	// 确保 UpdatedAt 不为零值，避免 GraphQL 序列化为 null 导致非空约束报错
	updatedAt := post.UpdatedAt
	if updatedAt.IsZero() {
		updatedAt = post.CreatedAt
		if updatedAt.IsZero() {
			updatedAt = time.Now()
		}
	}

	return &BlogPost{
		ID:            strconv.FormatUint(uint64(post.ID), 10),
		AuthorID:      strconv.FormatUint(uint64(post.AuthorID), 10),
		Title:         post.Title,
		Slug:          post.Slug,
		Excerpt:       excerpt,
		Content:       content,
		Tags:          tags,
		Categories:    categories,
		CoverImageURL: coverImageURL,
		AccessLevel:   accessLevel,
		Status:        status,
		PublishedAt:   post.PublishedAt,
		LastEditedAt:  post.LastEditedAt,
		CreatedAt:     post.CreatedAt,
		UpdatedAt:     updatedAt,
		Author:        author,
		Stats:         stats,
		IsLiked:       isLiked,
		Version:       post.Version,
		Versions:      []*BlogPostVersion{}, // 默认为空切片，满足非空约束且配合 resolver
	}
}

// SetBlogPostIsLiked 设置博客文章的点赞状态
func SetBlogPostIsLiked(graphqlPost *BlogPost, post *models.BlogPost, currentUser *models.User, db *gorm.DB) error {
	if currentUser == nil || post.Stats == nil {
		graphqlPost.IsLiked = false
		return nil
	}

	// 检查用户是否已经点赞了这篇文章
	var existingLike models.BlogPostLike
	err := db.Where("blog_post_id = ? AND user_id = ?", post.ID, currentUser.ID).First(&existingLike).Error
	if err != nil {
		// 没有点赞
		graphqlPost.IsLiked = false
	} else {
		// 已经点赞
		graphqlPost.IsLiked = true
	}

	return nil
}
