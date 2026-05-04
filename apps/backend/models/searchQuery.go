package models

import (
	"time"

	"gorm.io/gorm"
)

// SearchQuery 搜索查询记录
type SearchQuery struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Query       string         `gorm:"type:varchar(255);not null;index" json:"query"`
	UserID      *uint          `gorm:"index" json:"user_id,omitempty"`
	ResultCount int            `gorm:"default:0" json:"result_count"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// SearchQueryStats 搜索查询统计（聚合视图）
type SearchQueryStats struct {
	Query        string    `json:"query"`
	Count        int64     `json:"count"`
	LastSearched time.Time `json:"last_searched"`
}
