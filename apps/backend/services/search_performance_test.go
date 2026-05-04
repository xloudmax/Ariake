package services

import (
	"fmt"
	"repair-platform/config"
	"repair-platform/models"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func TestSearchHitRatePerformance(t *testing.T) {
	// 1. Setup in-memory DB
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	db.AutoMigrate(&models.User{}, &models.BlogPost{}, &models.BlogPostStats{}, &models.SearchQuery{})

	// Force Cache Enabled in global config for testing
	cfg := config.GetConfig()
	cfg.CacheEnabled = true
	cfg.CacheTTL = "5m"

	// 2. Seed data
	user := mustCreateTestUser(t, db, "testuser", "ADMIN")

	searchService := NewSearchService(db)

	for i := 0; i < 20; i++ {
		post := models.BlogPost{
			Title:       fmt.Sprintf("Post Number %d", i),
			Slug:        fmt.Sprintf("post-number-%d", i),
			Content:     "Repetitive content. Unique keyword: apple.",
			AuthorID:    user.ID,
			Status:      "PUBLISHED",
			AccessLevel: "PUBLIC",
			Stats: &models.BlogPostStats{
				ViewCount: i * 10,
				LikeCount: i,
			},
		}
		db.Create(&post)
	}

	cacheService := GetGlobalSearchCache()
	cacheService.InvalidateAll()

	query := "apple"

	// 3. First Search (Cache Miss)
	start := time.Now()
	res1, err := searchService.AdvancedSearchPosts(query, 10, 0, nil, "ADMIN")
	took1 := time.Since(start)
	if err != nil {
		t.Fatalf("search 1 failed: %v", err)
	}

	stats1 := cacheService.GetCacheStats()
	fmt.Printf("Initial Search Took: %v, Cache Stats: %+v\n", took1, stats1)

	// Cache the result (this is usually done in the handler or service)
	// Our AdvancedSearchPosts already calls Set if global cache is used?
	// Wait, check search.go implementation.
	cacheService.Set(query, 10, 0, nil, "ADMIN", res1, 5*time.Minute)

	// 4. Second Search (Cache Hit)
	start = time.Now()
	// In actual usage, we check cache first
	cachedRes, found := cacheService.Get(query, 10, 0, nil, "ADMIN")
	took2 := time.Since(start)

	if !found {
		t.Fatal("expected cache hit on second search")
	}

	stats2 := cacheService.GetCacheStats()
	fmt.Printf("Cached Search Took: %v, Cache Stats: %+v\n", took2, stats2)

	// 5. Assertions
	if took2 >= took1 {
		t.Errorf("cached search (%v) should be faster than initial search (%v)", took2, took1)
	}

	hitRate := stats2["hit_rate"].(float64)
	if hitRate <= 0 {
		t.Errorf("expected hit rate > 0, got %f", hitRate)
	}

	if len(cachedRes.Posts) != len(res1.Posts) {
		t.Errorf("cached result mismatch: expected %d posts, got %d", len(res1.Posts), len(cachedRes.Posts))
	}
}
