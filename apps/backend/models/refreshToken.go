package models

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"gorm.io/gorm"
)

// RefreshToken 刷新令牌模型 - 用于持久化和管理刷新令牌
type RefreshToken struct {
	ID         uint           `gorm:"primary_key" json:"id"`
	UserID     uint           `gorm:"not null;index" json:"user_id"`               // 关联的用户ID
	Token      string         `gorm:"unique;not null;index;size:255" json:"token"` // 加密后的token（SHA256）
	ExpiresAt  time.Time      `gorm:"not null;index" json:"expires_at"`            // 过期时间
	CreatedAt  time.Time      `json:"created_at"`                                  // 创建时间
	Revoked    bool           `gorm:"default:false;index" json:"revoked"`          // 是否已撤销
	RevokedAt  *time.Time     `json:"revoked_at,omitempty"`                        // 撤销时间
	DeviceInfo string         `gorm:"type:text" json:"device_info,omitempty"`      // 设备信息（可选）
	IPAddress  string         `gorm:"size:45" json:"ip_address,omitempty"`         // IP地址
	LastUsedAt *time.Time     `json:"last_used_at,omitempty"`                      // 最后使用时间
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`                              // 软删除
	User       User           `gorm:"foreignKey:UserID" json:"user,omitempty"`     // 关联用户
}

// RefreshTokenConfig 刷新令牌配置
type RefreshTokenConfig struct {
	TokenLength    int           // token 原始长度（字节）
	ExpiryDuration time.Duration // 过期时长
	EnableRotation bool          // 是否启用令牌旋转（刷新后撤销旧token）
}

var (
	// 默认配置
	DefaultRefreshTokenConfig = RefreshTokenConfig{
		TokenLength:    32,                  // 32字节 = 256位
		ExpiryDuration: 30 * 24 * time.Hour, // 30天
		EnableRotation: true,                // 启用旋转
	}

	// 刷新令牌相关错误
	ErrRefreshTokenNotFound = errors.New("刷新令牌不存在")
	ErrRefreshTokenExpired  = errors.New("刷新令牌已过期")
	ErrRefreshTokenRevoked  = errors.New("刷新令牌已被撤销")
	ErrRefreshTokenInvalid  = errors.New("无效的刷新令牌")
)

// GenerateRefreshToken 生成新的刷新令牌
// 返回：原始token（给前端）、token哈希（存数据库）、错误
func GenerateRefreshToken(userID uint, config RefreshTokenConfig, db *gorm.DB) (string, *RefreshToken, error) {
	// 1. 生成加密安全的随机token
	tokenBytes := make([]byte, config.TokenLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", nil, errors.New("生成随机token失败")
	}

	// 2. Base64 编码（给前端使用）
	rawToken := base64.URLEncoding.EncodeToString(tokenBytes)

	// 3. SHA256 哈希（存储到数据库）
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := base64.URLEncoding.EncodeToString(hash[:])

	// 4. 创建数据库记录
	refreshToken := &RefreshToken{
		UserID:    userID,
		Token:     tokenHash, // 存储哈希值，不存原始token
		ExpiresAt: time.Now().Add(config.ExpiryDuration),
		Revoked:   false,
	}

	// 5. 保存到数据库
	if err := db.Create(refreshToken).Error; err != nil {
		return "", nil, err
	}

	return rawToken, refreshToken, nil
}

// VerifyRefreshToken 验证刷新令牌
// 参数：rawToken 是前端传来的原始token
func VerifyRefreshToken(rawToken string, db *gorm.DB) (*RefreshToken, error) {
	// 1. 计算token的SHA256哈希
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := base64.URLEncoding.EncodeToString(hash[:])

	// 2. 查询数据库
	var refreshToken RefreshToken
	if err := db.Where("token = ?", tokenHash).Preload("User").First(&refreshToken).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRefreshTokenNotFound
		}
		return nil, err
	}

	// 3. 检查是否已撤销
	if refreshToken.Revoked {
		return nil, ErrRefreshTokenRevoked
	}

	// 4. 检查是否过期
	if time.Now().After(refreshToken.ExpiresAt) {
		// 自动撤销过期的token
		refreshToken.Revoke(db)
		return nil, ErrRefreshTokenExpired
	}

	// 5. 更新最后使用时间
	now := time.Now()
	refreshToken.LastUsedAt = &now
	db.Save(&refreshToken)

	return &refreshToken, nil
}

// Revoke 撤销刷新令牌
func (rt *RefreshToken) Revoke(db *gorm.DB) error {
	rt.Revoked = true
	now := time.Now()
	rt.RevokedAt = &now
	return db.Save(rt).Error
}

// RevokeAllUserTokens 撤销用户的所有刷新令牌（用于密码重置、强制登出等）
func RevokeAllUserTokens(userID uint, db *gorm.DB) error {
	now := time.Now()
	return db.Model(&RefreshToken{}).
		Where("user_id = ? AND revoked = false", userID).
		Updates(map[string]interface{}{
			"revoked":    true,
			"revoked_at": now,
		}).Error
}

// CleanupExpiredTokens 清理过期的刷新令牌（定时任务）
func CleanupExpiredTokens(db *gorm.DB) error {
	// 删除过期超过7天的token
	cutoffTime := time.Now().Add(-7 * 24 * time.Hour)
	return db.Unscoped(). // 硬删除
				Where("expires_at < ?", cutoffTime).
				Delete(&RefreshToken{}).Error
}

// GetUserActiveTokens 获取用户的活跃令牌列表（用于设备管理）
func GetUserActiveTokens(userID uint, db *gorm.DB) ([]RefreshToken, error) {
	var tokens []RefreshToken
	err := db.Where("user_id = ? AND revoked = false AND expires_at > ?", userID, time.Now()).
		Order("last_used_at DESC").
		Find(&tokens).Error
	return tokens, err
}

// IsValid 检查刷新令牌是否有效
func (rt *RefreshToken) IsValid() bool {
	return !rt.Revoked && time.Now().Before(rt.ExpiresAt)
}
