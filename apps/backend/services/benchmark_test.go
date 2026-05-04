// benchmark_test.go — Go benchmark suite covering search, cache, and tag services
// Run: go test -bench=. -benchmem -benchtime=3s -count=1 -run='^$' ./services/...
package services

import (
	"fmt"
	"repair-platform/models"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// ─── shared helpers ──────────────────────────────────────────────────────────

func benchDB(b *testing.B) *gorm.DB {
	b.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger:         logger.Default.LogMode(logger.Silent),
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	if err != nil {
		b.Fatalf("benchDB: %v", err)
	}
	db.AutoMigrate(&models.User{}, &models.BlogPost{}, &models.BlogPostStats{}, &models.SearchQuery{})
	return db
}

func seedBenchPosts(db *gorm.DB, n int) models.User {
	user := models.User{Username: "bench_author", Email: "bench@bench.local", Role: "ADMIN"}
	db.Create(&user)
	for i := 0; i < n; i++ {
		db.Create(&models.BlogPost{
			Title:       fmt.Sprintf("Benchmark Post %d about golang performance", i),
			Slug:        fmt.Sprintf("bench-post-%d", i),
			Content:     "This is a long test post about golang performance and benchmarking.",
			AuthorID:    user.ID,
			Status:      "PUBLISHED",
			AccessLevel: "PUBLIC",
			Stats: &models.BlogPostStats{
				ViewCount: i * 10,
				LikeCount: i % 5,
			},
		})
	}
	return user
}

// ─── Search Benchmarks ───────────────────────────────────────────────────────

// BenchmarkSearchCold — AdvancedSearchPosts with cache cleared each iteration.
func BenchmarkSearchCold(b *testing.B) {
	db := benchDB(b)
	seedBenchPosts(db, 100)
	svc := NewSearchService(db)
	cache := GetGlobalSearchCache()

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		cache.InvalidateAll()
		_, _ = svc.AdvancedSearchPosts("golang", 10, 0, nil, "ADMIN")
	}
}

// BenchmarkSearchCached — pure cache retrieval (hot path).
func BenchmarkSearchCached(b *testing.B) {
	db := benchDB(b)
	seedBenchPosts(db, 100)
	svc := NewSearchService(db)
	cache := GetGlobalSearchCache()

	// Warm up
	res, _ := svc.AdvancedSearchPosts("golang", 10, 0, nil, "ADMIN")
	cache.Set("golang", 10, 0, nil, "ADMIN", res, 5*time.Minute)

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = cache.Get("golang", 10, 0, nil, "ADMIN")
	}
}

// BenchmarkSearchPagination — measures paging overhead on 500 posts.
func BenchmarkSearchPagination(b *testing.B) {
	db := benchDB(b)
	seedBenchPosts(db, 500)
	svc := NewSearchService(db)
	cache := GetGlobalSearchCache()
	cache.InvalidateAll()

	offsets := []int{0, 50, 100, 200}
	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		cache.InvalidateAll()
		_, _ = svc.AdvancedSearchPosts("golang", 20, offsets[i%len(offsets)], nil, "ADMIN")
	}
}

// ─── Cache Benchmarks ────────────────────────────────────────────────────────

// BenchmarkCacheSet — cost of writing a result to the search cache.
func BenchmarkCacheSet(b *testing.B) {
	cache := GetGlobalSearchCache()
	cache.InvalidateAll()
	fakeResult := &SearchResult{Posts: make([]*models.BlogPost, 10)}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		key := fmt.Sprintf("query-%d", i%1000)
		cache.Set(key, 10, 0, nil, "ADMIN", fakeResult, 5*time.Minute)
	}
}

// BenchmarkCacheGet — cache read performance on the hot-hit path.
func BenchmarkCacheGet(b *testing.B) {
	cache := GetGlobalSearchCache()
	cache.InvalidateAll()
	fakeResult := &SearchResult{Posts: make([]*models.BlogPost, 10)}
	cache.Set("bench_query", 10, 0, nil, "ADMIN", fakeResult, 5*time.Minute)

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = cache.Get("bench_query", 10, 0, nil, "ADMIN")
	}
}

// ─── Tag Service Benchmarks ──────────────────────────────────────────────────

// BenchmarkGetTags — fetching the tag list (uses GetTags with nil params for "all").
func BenchmarkGetTags(b *testing.B) {
	db := benchDB(b)
	tagSvc := NewTagService(db)

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = tagSvc.GetTags(nil, nil, nil)
	}
}

// BenchmarkGetTagCategoryStats — aggregate stats query covering all tags + categories.
func BenchmarkGetTagCategoryStats(b *testing.B) {
	db := benchDB(b)
	seedBenchPosts(db, 200)
	tagSvc := NewTagService(db)

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = tagSvc.GetTagCategoryStats()
	}
}

// ─── Tokenizer Benchmark ─────────────────────────────────────────────────────

// BenchmarkTokenize — cost of the search query tokenizer (pure CPU, no DB).
func BenchmarkTokenize(b *testing.B) {
	svc := &SearchService{}
	queries := []string{
		"golang performance benchmark",
		"如何优化 GraphQL N+1 查询",
		"React useState useEffect hooks",
		"backend database indexing tips",
	}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = svc.tokenize(queries[i%len(queries)])
	}
}

// BenchmarkCalculateRelevanceScores — measures the scoring algorithm on 50 posts.
func BenchmarkCalculateRelevanceScores(b *testing.B) {
	svc := &SearchService{}
	posts := make([]models.BlogPost, 50)
	for i := range posts {
		posts[i] = models.BlogPost{
			Title:   fmt.Sprintf("Post about golang %d", i),
			Content: "Golang is a statically typed compiled language. Performance matters.",
			Tags:    "golang,performance,backend",
		}
	}
	keywords := []string{"golang", "performance"}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = svc.calculateRelevanceScores(posts, keywords)
	}
}
