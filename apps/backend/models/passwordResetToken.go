package models

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

// PasswordResetToken 用于存储密码重置或验证邮件的验证码
type PasswordResetToken struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null;index"`
	Token     string    `gorm:"not null;unique"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	ExpiresAt time.Time `gorm:"not null;index"`
}

// GenerateToken 生成随机令牌
func (p *PasswordResetToken) GenerateToken() error {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return err
	}
	p.Token = hex.EncodeToString(bytes)
	return nil
}
