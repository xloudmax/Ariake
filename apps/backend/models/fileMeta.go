package models

import (
	"time"

	"gorm.io/gorm"
)

// FileMeta 文件元数据，用于跟踪文件的所有权和实现更安全的管理
type FileMeta struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	Filename  string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"filename"`
	UserID    uint           `gorm:"index;not null" json:"userId"`
	Size      int64          `gorm:"not null" json:"size"`
	MimeType  string         `gorm:"type:varchar(100)" json:"mimeType"`
	CreatedAt time.Time      `json:"createdAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
