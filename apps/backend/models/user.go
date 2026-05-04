package models

import (
	"errors"
	"repair-platform/config"
	"time"

	"github.com/golang-jwt/jwt/v5" // 添加 JWT 库导入
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User 定义了用户数据模型
type User struct {
	ID              uint           `gorm:"primary_key" json:"id"`                       // 用户ID，主键
	Username        string         `gorm:"unique;not null;size:50" json:"username"`     // 用户名，唯一且不能为空
	Password        string         `gorm:"not null" json:"-"`                           // 密码（加密后存储），不返回给前端
	Email           string         `gorm:"unique;not null;size:100" json:"email"`       // 邮箱，唯一且不能为空
	Role            string         `gorm:"not null;default:'user';size:20" json:"role"` // 角色，默认为'user'
	IsVerified      bool           `gorm:"default:false" json:"is_verified"`            // 邮箱是否已验证，默认为false
	IsActive        bool           `gorm:"default:true" json:"is_active"`               // 用户是否激活
	Avatar          string         `gorm:"type:text" json:"avatar"`                     // 头像URL
	Bio             string         `gorm:"type:text" json:"bio"`                        // 用户简介
	LastLoginAt     *time.Time     `json:"last_login_at,omitempty"`                     // 最后登录时间
	LoginAttempts   int            `gorm:"default:0" json:"-"`                          // 登录尝试次数
	LockedUntil     *time.Time     `json:"-"`                                           // 账户锁定到期时间
	EmailVerifiedAt *time.Time     `json:"email_verified_at,omitempty"`                 // 邮箱验证时间
	CreatedAt       time.Time      `json:"created_at"`                                  // 创建时间
	UpdatedAt       time.Time      `json:"updated_at"`                                  // 更新时间
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-" swaggerignore:"true"`         // 删除时间，用于软删除
	IsAdmin         bool           `gorm:"default:false" json:"is_admin"`               // 是否为管理员
}

// RegisterInput 是用户注册请求的输入结构体
type RegisterInput struct {
	Username   string `json:"username" binding:"required"`       // 用户名，必须提供
	Password   string `json:"password" binding:"required,min=6"` // 密码，至少6个字符
	Email      string `json:"email" binding:"required,email"`    // 邮箱，必须为有效格式
	InviteCode string `json:"invite_code,omitempty" binding:""`  // 邀请码，可选
}

// LoginInput 是用户登录请求的输入结构体
type LoginInput struct {
	Identifier string `json:"identifier" binding:"required"`     // 用户名或邮箱
	Password   string `json:"password" binding:"required,min=6"` // 密码
	Remember   bool   `json:"remember,omitempty"`                // 是否记住登录状态
}

// EmailLoginInput 是邮箱登录请求的输入结构体
type EmailLoginInput struct {
	Email string `json:"email" binding:"required,email"` // 邮箱
}

// VerifyEmailInput 是邮箱验证请求的输入结构体
type VerifyEmailInput struct {
	Email string `json:"email" binding:"required,email"` // 邮箱
	Code  string `json:"code" binding:"required"`        // 验证码
	Type  string `json:"type" binding:"required"`        // 验证类型：REGISTER, LOGIN, RESET_PASSWORD
}

// UpdateProfileInput 是更新用户个人资料的输入结构体
type UpdateProfileInput struct {
	Username *string `json:"username,omitempty"`
	Bio      *string `json:"bio,omitempty"`
	Avatar   *string `json:"avatar,omitempty"`
}

// AdminCreateUserInput 是管理员创建用户的输入结构体
type AdminCreateUserInput struct {
	Username   string   `json:"username" binding:"required"`
	Email      string   `json:"email" binding:"required,email"`
	Password   string   `json:"password" binding:"required,min=6"`
	Role       UserRole `json:"role"`
	IsVerified bool     `json:"is_verified"`
}

// UserRole 用户角色枚举
type UserRole string

type ServerDashboard struct {
	UserCount          int    `json:"user_count"`
	PostCount          int    `json:"post_count"`
	TodayRegistrations int    `json:"today_registrations"`
	TodayPosts         int    `json:"today_posts"`
	ServerTime         string `json:"server_time"`
	Hostname           string `json:"hostname"`
	GoVersion          string `json:"go_version"`
	CPUCount           int    `json:"cpu_count"`
	Goroutines         int    `json:"goroutines"`
	Uptime             string `json:"uptime"`
}

// CreatePostInput 创建文章输入
type CreatePostInput struct {
	Title         string   `json:"title" binding:"required"`
	Content       string   `json:"content" binding:"required"`
	Tags          []string `json:"tags,omitempty"`
	Categories    []string `json:"categories,omitempty"`
	CoverImageURL *string  `json:"cover_image_url,omitempty"`
	Excerpt       *string  `json:"excerpt,omitempty"` // Added Excerpt
	AccessLevel   string   `json:"access_level,omitempty"`
	Status        string   `json:"status,omitempty"`
}

// UpdatePostInput 更新文章输入
type UpdatePostInput struct {
	Title         *string  `json:"title,omitempty"`
	Content       *string  `json:"content,omitempty"`
	Tags          []string `json:"tags,omitempty"`
	Categories    []string `json:"categories,omitempty"`
	CoverImageURL *string  `json:"cover_image_url,omitempty"`
	Excerpt       *string  `json:"excerpt,omitempty"` // Added Excerpt
	AccessLevel   *string  `json:"access_level,omitempty"`
	Status        *string  `json:"status,omitempty"`
	Version       *int     `json:"version,omitempty"`
	ChangeLog     string   `json:"change_log,omitempty"`
}

// SetPassword 为用户设置加密后的密码
func (user *User) SetPassword(password string) error {
	// 使用配置中的 bcrypt 成本而不是默认值
	cfg := config.GetConfig()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), cfg.BcryptCost)
	if err != nil {
		return errors.New("密码加密失败")
	}
	user.Password = string(hashedPassword)
	return nil
}

// CheckPassword 验证用户输入的密码是否正确
func (user *User) CheckPassword(password string) bool {
	// 将用户输入的密码与数据库中加密的密码进行比较
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	return err == nil
}

// GenerateJWT 为用户生成 JSON Web Token (JWT)
func GenerateJWT(userID uint, username string, role string, remember bool) (string, error) {
	// 获取配置中的过期时间设置
	cfg := config.GetConfig()

	// 解析配置中的超时时间
	sessionTimeout, err := time.ParseDuration(cfg.SessionTimeout)
	if err != nil {
		sessionTimeout = 24 * time.Hour // 默认24小时
	}

	refreshTimeout, err := time.ParseDuration(cfg.RefreshTimeout)
	if err != nil {
		refreshTimeout = 7 * 24 * time.Hour // 默认7天
	}

	// 根据是否记住登录状态设置过期时间
	expiration := sessionTimeout
	if remember {
		expiration = refreshTimeout
	}

	// 定义 JWT 的声明 (Claims)
	claims := jwt.MapClaims{
		"user_id":  userID,                            // 用户ID
		"username": username,                          // 用户名
		"role":     role,                              // 用户角色
		"exp":      time.Now().Add(expiration).Unix(), // 过期时间
		"iat":      time.Now().Unix(),                 // 签发时间
		"remember": remember,                          // 是否长期有效
	}

	// 使用 HS256 签名方法创建 Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 使用安全的密钥对 Token 进行签名
	secretKey := GetSecretKey()
	return token.SignedString([]byte(secretKey))
}

// IsAccountLocked 检查账户是否被锁定
func (user *User) IsAccountLocked() bool {
	return user.LockedUntil != nil && user.LockedUntil.After(time.Now())
}

// IncrementLoginAttempts 增加登录尝试次数
func (user *User) IncrementLoginAttempts(db *gorm.DB) error {
	user.LoginAttempts++
	// 如果登录尝试次数超过5次，锁定账户30分钟
	if user.LoginAttempts >= 5 {
		lockUntil := time.Now().Add(30 * time.Minute)
		user.LockedUntil = &lockUntil
	}
	return db.Save(user).Error
}

// ResetLoginAttempts 重置登录尝试次数
func (user *User) ResetLoginAttempts(db *gorm.DB) error {
	user.LoginAttempts = 0
	user.LockedUntil = nil
	return db.Save(user).Error
}

// UpdateLastLogin 更新最后登录时间
func (user *User) UpdateLastLogin(db *gorm.DB) error {
	now := time.Now()
	user.LastLoginAt = &now
	return db.Save(user).Error
}

// GetSecretKey 获取用于 JWT 签名的密钥
func GetSecretKey() string {
	// 从配置管理获取 JWT 密钥
	cfg := config.GetConfig()
	return cfg.JWTSecret
}

// ParseJWT 解析 JWT 令牌并返回声明
func ParseJWT(tokenString string) (jwt.MapClaims, error) {
	// 解析 JWT 令牌
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("无效的签名方法")
		}
		return []byte(GetSecretKey()), nil
	})

	if err != nil {
		return nil, err
	}

	// 验证令牌是否有效并获取声明
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("无效的令牌")
}

// getEnv 获取环境变量的值，如果不存在则返回默认值
