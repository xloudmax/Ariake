package graph

import (
	"repair-platform/services"

	"gorm.io/gorm"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	DB            *gorm.DB
	SearchService *services.SearchService
	NotionService *services.NotionService
	AIService     *services.AIService
	DeployService *services.DeployService
}

// NewResolver 创建一个新的resolver实例
func NewResolver(db *gorm.DB, notionService *services.NotionService, aiService *services.AIService) *Resolver {
	return &Resolver{
		DB:            db,
		SearchService: services.NewSearchService(db),
		NotionService: notionService,
		AIService:     aiService,
		DeployService: services.NewDeployService(db),
	}
}
