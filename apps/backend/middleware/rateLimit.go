package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// rateLimiter 实现滑动窗口限流（按 IP+路径）
type rateLimiter struct {
	window time.Duration
	max    int
	mu     sync.Mutex
	visits map[string][]time.Time
}

var (
	limiterMu     sync.Mutex
	rateLimiters  = make(map[string]*rateLimiter)
	rateCleanOnce sync.Once
)

// ConditionalRateLimit 返回一个滑动窗口限流中间件
// window: 时间窗口长度；maxReq: 窗口内允许的最大请求数
// 管理员用户免限流，仅对指定路径生效
func ConditionalRateLimit(window time.Duration, maxReq int, paths ...string) gin.HandlerFunc {
	limiter := getRateLimiter(window, maxReq)
	return func(c *gin.Context) {
		logger := GetLogger()

		path := c.FullPath()
		if !shouldLimitPath(path, paths) {
			c.Next()
			return
		}

		// 管理员绕过限流
		if IsAdmin(c) {
			logger.Infow("Admin user bypassing rate limit", "path", path, "ip", c.ClientIP())
			c.Next()
			return
		}

		ip := c.ClientIP()
		allowed, count := limiter.Allow(ip, path)
		if !allowed {
			logger.Warnw("Rate limit exceeded", "ip", ip, "path", path, "requests", count, "window", window, "max", maxReq)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": fmt.Sprintf("您在 %v 内的访问过于频繁（已超过 %d 次），请稍后再试。", window, maxReq),
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			return
		}

		c.Next()
	}
}

// GraphQLRateLimit GraphQL专用限流中间件
func GraphQLRateLimit(window time.Duration, maxReq int) gin.HandlerFunc {
	return ConditionalRateLimit(window, maxReq, "/graphql")
}

// CleanupExpiredVisits 定期清理过期访问记录（全局启动一次即可）
func CleanupExpiredVisits(window time.Duration) {
	rateCleanOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(window)
			defer ticker.Stop()
			for range ticker.C {
				limiterMu.Lock()
				for _, limiter := range rateLimiters {
					limiter.cleanup()
				}
				limiterMu.Unlock()
			}
		}()
	})
}

// shouldLimitPath 判断当前路径是否需要限流
func shouldLimitPath(path string, paths []string) bool {
	if len(paths) == 0 {
		return true
	}
	for _, limitPath := range paths {
		if path == limitPath || strings.HasPrefix(path, limitPath) {
			return true
		}
	}
	return false
}

// getRateLimiter 获取或创建指定配置的限流器
func getRateLimiter(window time.Duration, maxReq int) *rateLimiter {
	key := fmt.Sprintf("%v:%d", window, maxReq)
	limiterMu.Lock()
	defer limiterMu.Unlock()

	if l, ok := rateLimiters[key]; ok {
		return l
	}

	l := &rateLimiter{
		window: window,
		max:    maxReq,
		visits: make(map[string][]time.Time),
	}
	rateLimiters[key] = l
	return l
}

// Allow 检查是否允许访问，返回是否允许及当前窗口内请求数
func (l *rateLimiter) Allow(ip, path string) (bool, int) {
	key := ip + "|" + path
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	times := l.visits[key]
	// 清理窗口外的请求
	cutoff := now.Add(-l.window)
	filtered := times[:0]
	for _, t := range times {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}

	filtered = append(filtered, now)
	l.visits[key] = filtered

	if len(filtered) > l.max {
		return false, len(filtered)
	}
	return true, len(filtered)
}

// cleanup 清理所有 key 的过期记录，减少内存占用
func (l *rateLimiter) cleanup() {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	for key, times := range l.visits {
		idx := 0
		for _, t := range times {
			if t.After(cutoff) {
				times[idx] = t
				idx++
			}
		}
		if idx == 0 {
			delete(l.visits, key)
		} else {
			l.visits[key] = times[:idx]
		}
	}
	l.mu.Unlock()
}
