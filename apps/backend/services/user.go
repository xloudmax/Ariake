package services

import (
	"errors"
	"repair-platform/models"
	"time"

	"gorm.io/gorm"
)

// UserService 用户管理服务
type UserService struct {
	db *gorm.DB
}

// NewUserService 创建用户管理服务实例
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// GetUserByID 根据ID获取用户
func (s *UserService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrUserNotFound
		}
		return nil, models.ErrInternalServerError
	}
	return &user, nil
}

// GetUserByUsername 根据用户名获取用户
func (s *UserService) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrUserNotFound
		}
		return nil, models.ErrInternalServerError
	}
	return &user, nil
}

// GetUserByEmail 根据邮箱获取用户
func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrUserNotFound
		}
		return nil, models.ErrInternalServerError
	}
	return &user, nil
}

// GetUsers 获取用户列表
func (s *UserService) GetUsers(limit, offset int, search, role string, isVerified *bool) ([]*models.User, error) {
	query := s.db.Model(&models.User{})

	// 搜索条件
	if search != "" {
		query = query.Where("username LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// 角色过滤
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// 验证状态过滤
	if isVerified != nil {
		query = query.Where("is_verified = ?", *isVerified)
	}

	var users []*models.User
	if err := query.Limit(limit).Offset(offset).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return users, nil
}

// UpdateProfile 更新用户个人资料
func (s *UserService) UpdateProfile(userID uint, input *models.UpdateProfileInput) (*models.User, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	// 更新字段
	if input.Username != nil && *input.Username != "" {
		// 检查用户名是否已被其他用户使用
		var count int64
		s.db.Model(&models.User{}).Where("username = ? AND id != ?", *input.Username, userID).Count(&count)
		if count > 0 {
			return nil, errors.New("用户名已被使用")
		}
		user.Username = *input.Username
	}

	if input.Bio != nil {
		user.Bio = *input.Bio
	}

	if input.Avatar != nil {
		user.Avatar = *input.Avatar
	}

	if err := s.db.Save(user).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return user, nil
}

// ChangePassword 修改密码
func (s *UserService) ChangePassword(userID uint, currentPassword, newPassword string) error {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	// 验证当前密码
	if !user.CheckPassword(currentPassword) {
		return models.ErrInvalidCredentials
	}

	// 设置新密码
	if err := user.SetPassword(newPassword); err != nil {
		return models.ErrInternalServerError
	}

	if err := s.db.Save(user).Error; err != nil {
		return models.ErrInternalServerError
	}

	return nil
}

// GetUserPosts 获取用户的文章列表
func (s *UserService) GetUserPosts(userID uint, limit, offset int) ([]*models.BlogPost, error) {
	var posts []*models.BlogPost
	if err := s.db.Where("author_id = ?", userID).
		Limit(limit).Offset(offset).
		Order("created_at DESC").
		Find(&posts).Error; err != nil {
		return nil, models.ErrInternalServerError
	}
	return posts, nil
}

// GetUserPostsCount 获取用户的文章数量
func (s *UserService) GetUserPostsCount(userID uint) (int64, error) {
	var count int64
	if err := s.db.Model(&models.BlogPost{}).Where("author_id = ?", userID).Count(&count).Error; err != nil {
		return 0, models.ErrInternalServerError
	}
	return count, nil
}

// AdminService 管理员服务
type AdminService struct {
	db *gorm.DB
}

// NewAdminService 创建管理员服务实例
func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

// CreateUser 管理员创建用户
func (s *AdminService) CreateUser(input *models.AdminCreateUserInput) (*models.User, error) {
	// 检查用户名和邮箱是否已存在
	var count int64
	s.db.Model(&models.User{}).Where("username = ? OR email = ?", input.Username, input.Email).Count(&count)
	if count > 0 {
		return nil, errors.New("用户名或邮箱已存在")
	}

	user := &models.User{
		Username:   input.Username,
		Email:      input.Email,
		Role:       string(input.Role),
		IsVerified: input.IsVerified,
		IsActive:   true,
	}

	if err := user.SetPassword(input.Password); err != nil {
		return nil, models.ErrInternalServerError
	}

	if input.IsVerified {
		now := time.Now()
		user.EmailVerifiedAt = &now
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return user, nil
}

// UpdateUser 管理员更新用户
func (s *AdminService) UpdateUser(userID uint, username, email *string, role *string, isVerified, isActive *bool) (*models.User, error) {
	user, err := s.getUserByID(userID)
	if err != nil {
		return nil, err
	}

	// 更新字段
	if username != nil && *username != "" {
		// 检查用户名是否已被其他用户使用
		var count int64
		s.db.Model(&models.User{}).Where("username = ? AND id != ?", *username, userID).Count(&count)
		if count > 0 {
			return nil, errors.New("用户名已被使用")
		}
		user.Username = *username
	}

	if email != nil && *email != "" {
		// 检查邮箱是否已被其他用户使用
		var count int64
		s.db.Model(&models.User{}).Where("email = ? AND id != ?", *email, userID).Count(&count)
		if count > 0 {
			return nil, errors.New("邮箱已被使用")
		}
		user.Email = *email
		// 如果邮箱发生变化，需要重新验证
		user.IsVerified = false
		user.EmailVerifiedAt = nil
	}

	if role != nil {
		user.Role = *role
	}

	if isVerified != nil {
		user.IsVerified = *isVerified
		if *isVerified && user.EmailVerifiedAt == nil {
			now := time.Now()
			user.EmailVerifiedAt = &now
		}
	}

	if isActive != nil {
		user.IsActive = *isActive
	}

	if err := s.db.Save(user).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return user, nil
}

// DeleteUser 管理员删除用户
func (s *AdminService) DeleteUser(userID uint) error {
	user, err := s.getUserByID(userID)
	if err != nil {
		return err
	}

	// 不能删除管理员账户
	if user.Role == "ADMIN" {
		return errors.New("不能删除管理员账户")
	}

	if err := s.db.Delete(user).Error; err != nil {
		return models.ErrInternalServerError
	}

	return nil
}

// GetServerDashboard 获取服务器仪表盘数据
func (s *AdminService) GetServerDashboard() (*models.ServerDashboard, error) {
	// 获取用户总数
	var userCount int64
	s.db.Model(&models.User{}).Count(&userCount)

	// 获取文章总数
	var postCount int64
	s.db.Model(&models.BlogPost{}).Count(&postCount)

	// 获取今日注册数
	var todayRegistrations int64
	today := time.Now().Truncate(24 * time.Hour)
	s.db.Model(&models.User{}).Where("created_at >= ?", today).Count(&todayRegistrations)

	// 获取今日文章数
	var todayPosts int64
	s.db.Model(&models.BlogPost{}).Where("created_at >= ?", today).Count(&todayPosts)

	dashboard := &models.ServerDashboard{
		UserCount:          int(userCount),
		PostCount:          int(postCount),
		TodayRegistrations: int(todayRegistrations),
		TodayPosts:         int(todayPosts),
	}

	return dashboard, nil
}

// getUserByID 内部方法获取用户
func (s *AdminService) getUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrUserNotFound
		}
		return nil, models.ErrInternalServerError
	}
	return &user, nil
}
