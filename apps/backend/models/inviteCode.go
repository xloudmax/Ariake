package models

import (
	"math/rand"
	"time"

	"gorm.io/gorm"
)

// InviteCode 定义了邀请码数据模型
type InviteCode struct {
	ID          uint           `gorm:"primary_key" json:"id"`
	Code        string         `gorm:"unique;not null;size:32" json:"code"`          // 邀请码
	CreatedByID uint           `gorm:"not null" json:"created_by_id"`                // 创建者ID
	CreatedBy   User           `gorm:"foreignKey:CreatedByID" json:"created_by"`     // 创建者信息
	UsedByID    *uint          `json:"used_by_id,omitempty"`                         // 使用者ID
	UsedBy      *User          `gorm:"foreignKey:UsedByID" json:"used_by,omitempty"` // 使用者信息
	UsedAt      *time.Time     `json:"used_at,omitempty"`                            // 使用时间
	ExpiresAt   *time.Time     `json:"expires_at,omitempty"`                         // 过期时间（可选）
	MaxUses     int            `gorm:"default:1" json:"max_uses"`                    // 最大使用次数
	CurrentUses int            `gorm:"default:0" json:"current_uses"`                // 当前使用次数
	IsActive    bool           `gorm:"default:true" json:"is_active"`                // 是否激活
	Description string         `gorm:"type:text" json:"description"`                 // 描述
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// GenerateInviteCode 生成邀请码
func GenerateInviteCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 16

	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}

	// 格式化为 XXXX-XXXX-XXXX-XXXX
	code := string(b)
	return code[:4] + "-" + code[4:8] + "-" + code[8:12] + "-" + code[12:16]
}

// IsExpired 检查邀请码是否过期
func (ic *InviteCode) IsExpired() bool {
	if ic.ExpiresAt == nil {
		return false // 没有过期时间，永不过期
	}
	return time.Now().After(*ic.ExpiresAt)
}

// IsUsable 检查邀请码是否可用
func (ic *InviteCode) IsUsable() bool {
	return ic.IsActive && !ic.IsExpired() && ic.CurrentUses < ic.MaxUses
}

// UseInviteCode 使用邀请码
func (ic *InviteCode) UseInviteCode(userID uint, db *gorm.DB) error {
	if !ic.IsUsable() {
		return ErrInviteCodeNotUsable
	}

	ic.CurrentUses++
	if ic.UsedByID == nil {
		ic.UsedByID = &userID
		now := time.Now()
		ic.UsedAt = &now
	}

	// 如果达到最大使用次数，设为不可用
	if ic.CurrentUses >= ic.MaxUses {
		ic.IsActive = false
	}

	return db.Save(ic).Error
}

// CreateInviteCodeInput 创建邀请码的输入结构体
type CreateInviteCodeInput struct {
	ExpiresAt   *time.Time `json:"expires_at"`
	MaxUses     int        `json:"max_uses" binding:"min=1"`
	Description string     `json:"description"`
}
