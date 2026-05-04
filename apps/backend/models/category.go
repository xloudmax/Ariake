package models

import (
	"time"

	"gorm.io/gorm"
)

// Category represents a blog post category
type Category struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"unique;not null;size:50;index" json:"name"`
	Posts     []*BlogPost    `gorm:"many2many:blog_post_categories;" json:"posts,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
