package services

import (
	"crypto/md5"
	"fmt"
	"repair-platform/models"
	"time"

	"github.com/goccy/go-json"
)

// SearchCacheService 搜索缓存服务
type SearchCacheService struct {
	cache models.Cache
}

// NewSearchCacheService 创建搜索缓存服务
func NewSearchCacheService() *SearchCacheService {
	return &SearchCacheService{
		cache: models.NewMemoryCache(10 * time.Minute), // 每10分钟清理一次
	}
}

// CachedSearchResult 缓存的搜索结果
type CachedSearchResult struct {
	Posts     []*models.BlogPost `json:"posts"`
	Total     int64              `json:"total"`
	Took      time.Duration      `json:"took"`
	CachedAt  time.Time          `json:"cached_at"`
	ExpiresAt time.Time          `json:"expires_at"`
}

// generateCacheKey 生成缓存键
func (s *SearchCacheService) generateCacheKey(query string, limit, offset int, userID *uint, userRole string) string {
	keyData := map[string]interface{}{
		"query":    query,
		"limit":    limit,
		"offset":   offset,
		"userID":   userID,
		"userRole": userRole,
	}

	jsonData, _ := json.Marshal(keyData)
	hash := md5.Sum(jsonData)
	return fmt.Sprintf("search:%x", hash)
}

// Get 获取缓存的搜索结果
func (s *SearchCacheService) Get(query string, limit, offset int, userID *uint, userRole string) (*CachedSearchResult, bool) {
	key := s.generateCacheKey(query, limit, offset, userID, userRole)

	var result CachedSearchResult
	if found := s.cache.Get(key, &result); found {
		// 检查是否过期
		if time.Now().Before(result.ExpiresAt) {
			return &result, true
		}
		// 过期则删除
		s.cache.Delete(key)
	}

	return nil, false
}

// Set 设置搜索结果缓存
func (s *SearchCacheService) Set(query string, limit, offset int, userID *uint, userRole string, result *SearchResult, ttl time.Duration) {
	key := s.generateCacheKey(query, limit, offset, userID, userRole)

	cachedResult := &CachedSearchResult{
		Posts:     result.Posts,
		Total:     result.Total,
		Took:      result.Took,
		CachedAt:  time.Now(),
		ExpiresAt: time.Now().Add(ttl),
	}

	s.cache.Set(key, cachedResult, ttl)
}

// InvalidateByPattern 根据模式失效缓存
func (s *SearchCacheService) InvalidateByPattern(pattern string) {
	// 简化实现：清空所有搜索缓存
	// 在实际项目中可以实现更精确的模式匹配
	s.cache.Clear()
}

// InvalidateAll 清空所有搜索缓存
func (s *SearchCacheService) InvalidateAll() {
	s.cache.Clear()
}

// GetCacheStats 获取缓存统计信息
func (s *SearchCacheService) GetCacheStats() map[string]interface{} {
	hits, misses := s.cache.GetStats()
	total := hits + misses
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(hits) / float64(total)
	}

	return map[string]interface{}{
		"total_items": s.cache.Count(),
		"hits":        hits,
		"misses":      misses,
		"hit_rate":    hitRate,
		"cache_type":  "memory",
	}
}

// 全局搜索缓存实例
var globalSearchCache *SearchCacheService

// GetGlobalSearchCache 获取全局搜索缓存实例
func GetGlobalSearchCache() *SearchCacheService {
	if globalSearchCache == nil {
		globalSearchCache = NewSearchCacheService()
	}
	return globalSearchCache
}
