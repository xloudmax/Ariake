package services

import (
	"errors"
	"repair-platform/models"
	"time"

	"gorm.io/gorm"
)

// InviteCodeService 邀请码管理服务
type InviteCodeService struct {
	db *gorm.DB
}

// NewInviteCodeService 创建邀请码管理服务实例
func NewInviteCodeService(db *gorm.DB) *InviteCodeService {
	return &InviteCodeService{db: db}
}

// CreateInviteCode 创建邀请码
func (s *InviteCodeService) CreateInviteCode(createdByID uint, input *models.CreateInviteCodeInput) (*models.InviteCode, error) {
	// 生成唯一的邀请码
	var code string
	var exists bool
	maxAttempts := 10

	for attempts := 0; attempts < maxAttempts; attempts++ {
		code = models.GenerateInviteCode()

		// 检查是否已存在
		var count int64
		s.db.Model(&models.InviteCode{}).Where("code = ?", code).Count(&count)
		if count == 0 {
			exists = false
			break
		}
		exists = true
	}

	if exists {
		return nil, errors.New("生成邀请码失败，请重试")
	}

	inviteCode := &models.InviteCode{
		Code:        code,
		CreatedByID: createdByID,
		ExpiresAt:   input.ExpiresAt,
		MaxUses:     input.MaxUses,
		CurrentUses: 0,
		IsActive:    true,
		Description: input.Description,
	}

	if err := s.db.Create(inviteCode).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return inviteCode, nil
}

// GetInviteCodes 获取邀请码列表
func (s *InviteCodeService) GetInviteCodes(limit, offset int, isActive *bool) ([]*models.InviteCode, error) {
	query := s.db.Model(&models.InviteCode{}).Preload("CreatedBy").Preload("UsedBy")

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	var inviteCodes []*models.InviteCode
	if err := query.Limit(limit).Offset(offset).Order("created_at DESC").Find(&inviteCodes).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return inviteCodes, nil
}

// GetInviteCodeByCode 根据邀请码字符串获取邀请码
func (s *InviteCodeService) GetInviteCodeByCode(code string) (*models.InviteCode, error) {
	var inviteCode models.InviteCode
	if err := s.db.Where("code = ?", code).First(&inviteCode).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrInviteCodeNotFound
		}
		return nil, models.ErrInternalServerError
	}
	return &inviteCode, nil
}

// DeactivateInviteCode 停用邀请码
func (s *InviteCodeService) DeactivateInviteCode(id uint) error {
	var inviteCode models.InviteCode
	if err := s.db.First(&inviteCode, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrInviteCodeNotFound
		}
		return models.ErrInternalServerError
	}

	inviteCode.IsActive = false
	if err := s.db.Save(&inviteCode).Error; err != nil {
		return models.ErrInternalServerError
	}

	return nil
}

// UseInviteCode 使用邀请码
func (s *InviteCodeService) UseInviteCode(code string, userID uint) error {
	inviteCode, err := s.GetInviteCodeByCode(code)
	if err != nil {
		return err
	}

	return inviteCode.UseInviteCode(userID, s.db)
}

// GetInviteCodeStats 获取邀请码统计信息
func (s *InviteCodeService) GetInviteCodeStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 总邀请码数
	var total int64
	s.db.Model(&models.InviteCode{}).Count(&total)
	stats["total"] = total

	// 活跃邀请码数
	var active int64
	s.db.Model(&models.InviteCode{}).Where("is_active = ?", true).Count(&active)
	stats["active"] = active

	// 过期邀请码数
	var expired int64
	s.db.Model(&models.InviteCode{}).Where("expires_at < ?", time.Now()).Count(&expired)
	stats["expired"] = expired

	// 已使用完的邀请码数
	var exhausted int64
	s.db.Model(&models.InviteCode{}).Where("current_uses >= max_uses").Count(&exhausted)
	stats["exhausted"] = exhausted

	// 本月创建的邀请码数
	monthStart := time.Now().AddDate(0, 0, -time.Now().Day()+1).Truncate(24 * time.Hour)
	var thisMonth int64
	s.db.Model(&models.InviteCode{}).Where("created_at >= ?", monthStart).Count(&thisMonth)
	stats["thisMonth"] = thisMonth

	// 本月使用的邀请码数
	var usedThisMonth int64
	s.db.Model(&models.InviteCode{}).Where("used_at >= ? AND used_at IS NOT NULL", monthStart).Count(&usedThisMonth)
	stats["usedThisMonth"] = usedThisMonth

	return stats, nil
}

// CleanupExpiredInviteCodes 清理过期的邀请码
func (s *InviteCodeService) CleanupExpiredInviteCodes() error {
	// 将过期的邀请码设为不活跃
	result := s.db.Model(&models.InviteCode{}).
		Where("expires_at < ? AND is_active = ?", time.Now(), true).
		Update("is_active", false)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// GetUserInviteCodes 获取用户创建的邀请码
func (s *InviteCodeService) GetUserInviteCodes(userID uint, limit, offset int) ([]*models.InviteCode, error) {
	var inviteCodes []*models.InviteCode
	if err := s.db.Where("created_by_id = ?", userID).
		Preload("UsedBy").
		Limit(limit).Offset(offset).
		Order("created_at DESC").
		Find(&inviteCodes).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return inviteCodes, nil
}

// GetMostUsedInviteCodes 获取使用次数最多的邀请码
func (s *InviteCodeService) GetMostUsedInviteCodes(limit int) ([]*models.InviteCode, error) {
	var inviteCodes []*models.InviteCode
	if err := s.db.Where("current_uses > 0").
		Preload("CreatedBy").
		Limit(limit).
		Order("current_uses DESC").
		Find(&inviteCodes).Error; err != nil {
		return nil, models.ErrInternalServerError
	}

	return inviteCodes, nil
}
