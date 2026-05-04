package models

import (
	"repair-platform/utils"

	"gorm.io/gorm"
)

// Setting 表示应用程序的全局配置
type Setting struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Key   string `gorm:"uniqueIndex;not null" json:"key"` // 配置键
	Value string `gorm:"type:text" json:"value"`          // 配置值
}

// GetSetting 获取配置
func GetSetting(db *gorm.DB, key string) (string, error) {
	var setting Setting
	err := db.Where("key = ?", key).First(&setting).Error
	if err != nil {
		return "", err
	}
	return setting.Value, nil
}

// SetSetting 设置配置
func SetSetting(db *gorm.DB, key, value string) error {
	var setting Setting
	err := db.Where("key = ?", key).First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		return db.Create(&Setting{Key: key, Value: value}).Error
	} else if err != nil {
		return err
	}
	setting.Value = value
	return db.Save(&setting).Error
}

// GetSensitiveSetting 获取加密的配置
func GetSensitiveSetting(db *gorm.DB, key string) (string, error) {
	encryptedValue, err := GetSetting(db, key)
	if err != nil {
		return "", err
	}
	if encryptedValue == "" {
		return "", nil
	}
	return utils.Decrypt(encryptedValue)
}

// SetSensitiveSetting 设置加密的配置
func SetSensitiveSetting(db *gorm.DB, key, value string) error {
	if value == "" {
		return SetSetting(db, key, "")
	}
	encryptedValue, err := utils.Encrypt(value)
	if err != nil {
		return err
	}
	return SetSetting(db, key, encryptedValue)
}
