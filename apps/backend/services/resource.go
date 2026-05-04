package services

import (
	"fmt"
	"repair-platform/models"
	"repair-platform/utils"

	"gorm.io/gorm"
)

// ResourceService 统一资源查找服务
type ResourceService struct {
	db *gorm.DB
}

// NewResourceService 创建资源服务实例
func NewResourceService(db *gorm.DB) *ResourceService {
	return &ResourceService{db: db}
}

// BlogPostQuery 博客文章查询结果
type BlogPostQuery struct {
	Post  *models.BlogPost
	Error error
}

// UserQuery 用户查询结果
type UserQuery struct {
	User  *models.User
	Error error
}

// FindBlogPost 通过ID或Slug查找博客文章
func (rs *ResourceService) FindBlogPost(identifier string, userID *uint, userRole string, skipCount bool) *BlogPostQuery {
	// 解析ID
	idInfo, err := utils.ParseID(identifier)
	if err != nil {
		return &BlogPostQuery{
			Post:  nil,
			Error: fmt.Errorf("无效的文章标识符: %w", err),
		}
	}

	blogService := NewBlogService(rs.db)

	switch idInfo.Type {
	case utils.IDTypeNumeric:
		// 通过数字ID查找
		post, err := blogService.GetPostByID(uint(idInfo.NumericValue), userID, userRole, skipCount)
		return &BlogPostQuery{Post: post, Error: err}

	case utils.IDTypeSlug:
		// 通过Slug查找
		post, err := blogService.GetPostBySlug(idInfo.SlugValue, userID, userRole, skipCount)
		return &BlogPostQuery{Post: post, Error: err}

	default:
		return &BlogPostQuery{
			Post:  nil,
			Error: fmt.Errorf("不支持的文章ID类型: %v", idInfo.Type),
		}
	}
}

// FindBlogPostStrict 严格查找博客文章（仅限数字ID）
func (rs *ResourceService) FindBlogPostStrict(identifier string, userID *uint, userRole string, skipCount bool) *BlogPostQuery {
	numericID, err := utils.ParseNumericID(identifier)
	if err != nil {
		return &BlogPostQuery{
			Post:  nil,
			Error: fmt.Errorf("需要数字ID: %w", err),
		}
	}

	blogService := NewBlogService(rs.db)
	post, err := blogService.GetPostByID(uint(numericID), userID, userRole, skipCount)
	return &BlogPostQuery{Post: post, Error: err}
}

// FindUser 通过ID、用户名或邮箱查找用户
func (rs *ResourceService) FindUser(identifier string) *UserQuery {
	userService := NewUserService(rs.db)

	// 首先尝试解析为ID
	idInfo, err := utils.ParseID(identifier)
	if err == nil && idInfo.Type == utils.IDTypeNumeric {
		// 通过数字ID查找
		user, err := userService.GetUserByID(uint(idInfo.NumericValue))
		return &UserQuery{User: user, Error: err}
	}

	// 检查是否为邮箱格式
	if rs.isEmailFormat(identifier) {
		user, err := userService.GetUserByEmail(identifier)
		return &UserQuery{User: user, Error: err}
	}

	// 作为用户名查找
	user, err := userService.GetUserByUsername(identifier)
	return &UserQuery{User: user, Error: err}
}

// FindUserStrict 严格查找用户（仅限数字ID）
func (rs *ResourceService) FindUserStrict(identifier string) *UserQuery {
	numericID, err := utils.ParseNumericID(identifier)
	if err != nil {
		return &UserQuery{
			User:  nil,
			Error: fmt.Errorf("需要数字ID: %w", err),
		}
	}

	userService := NewUserService(rs.db)
	user, err := userService.GetUserByID(uint(numericID))
	return &UserQuery{User: user, Error: err}
}

// isEmailFormat 检查字符串是否为邮箱格式
func (rs *ResourceService) isEmailFormat(s string) bool {
	// 简单的邮箱格式检查
	return len(s) > 3 &&
		len(s) <= 254 &&
		containsChar(s, '@') &&
		containsChar(s, '.') &&
		!startsOrEndsWithChar(s, '@') &&
		!startsOrEndsWithChar(s, '.')
}

// containsChar 检查字符串是否包含指定字符
func containsChar(s string, c rune) bool {
	for _, r := range s {
		if r == c {
			return true
		}
	}
	return false
}

// startsOrEndsWithChar 检查字符串是否以指定字符开头或结尾
func startsOrEndsWithChar(s string, c rune) bool {
	runes := []rune(s)
	if len(runes) == 0 {
		return false
	}
	return runes[0] == c || runes[len(runes)-1] == c
}

// BatchFindBlogPosts 批量查找博客文章
func (rs *ResourceService) BatchFindBlogPosts(identifiers []string, userID *uint, userRole string, skipCount bool) map[string]*BlogPostQuery {
	results := make(map[string]*BlogPostQuery)

	for _, identifier := range identifiers {
		results[identifier] = rs.FindBlogPost(identifier, userID, userRole, skipCount)
	}

	return results
}

// BatchFindUsers 批量查找用户
func (rs *ResourceService) BatchFindUsers(identifiers []string) map[string]*UserQuery {
	results := make(map[string]*UserQuery)

	for _, identifier := range identifiers {
		results[identifier] = rs.FindUser(identifier)
	}

	return results
}

// ResolverHelper GraphQL解析器辅助方法
type ResolverHelper struct {
	resourceService *ResourceService
}

// NewResolverHelper 创建解析器辅助实例
func NewResolverHelper(db *gorm.DB) *ResolverHelper {
	return &ResolverHelper{
		resourceService: NewResourceService(db),
	}
}

// ResolveBlogPost 解析博客文章（用于GraphQL resolver）
func (rh *ResolverHelper) ResolveBlogPost(id string, userID *uint, userRole string, skipCount bool) (*models.BlogPost, error) {
	query := rh.resourceService.FindBlogPost(id, userID, userRole, skipCount)
	return query.Post, query.Error
}

// ResolveBlogPostStrict 严格解析博客文章（仅数字ID）
func (rh *ResolverHelper) ResolveBlogPostStrict(id string, userID *uint, userRole string, skipCount bool) (*models.BlogPost, error) {
	query := rh.resourceService.FindBlogPostStrict(id, userID, userRole, skipCount)
	return query.Post, query.Error
}

// ResolveUser 解析用户
func (rh *ResolverHelper) ResolveUser(id string) (*models.User, error) {
	query := rh.resourceService.FindUser(id)
	return query.User, query.Error
}

// ResolveUserStrict 严格解析用户（仅数字ID）
func (rh *ResolverHelper) ResolveUserStrict(id string) (*models.User, error) {
	query := rh.resourceService.FindUserStrict(id)
	return query.User, query.Error
}

// ParseAndValidatePostID 解析并验证文章ID（向后兼容的辅助函数）
func ParseAndValidatePostID(id string) (uint64, error) {
	return utils.ParseNumericID(id)
}

// ParseAndValidateUserID 解析并验证用户ID（向后兼容的辅助函数）
func ParseAndValidateUserID(id string) (uint64, error) {
	return utils.ParseNumericID(id)
}

// ParseFlexiblePostID 灵活解析文章ID（支持数字和Slug）
func ParseFlexiblePostID(id string) (numericID uint64, slug string, isNumeric bool, err error) {
	return utils.ParseFlexibleID(id)
}
