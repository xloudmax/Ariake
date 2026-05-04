package middleware

import (
	"sync"
	"testing"
	"time"
)

// TestRateLimiterConcurrency tests thread safety under high concurrency
func TestRateLimiterConcurrency(t *testing.T) {
	// Use a unique window/limit to ensure a fresh limiter instance
	// Allow 100 requests per 200ms
	l := getRateLimiter(200*time.Millisecond, 100)

	var wg sync.WaitGroup
	workers := 10
	requestsPerWorker := 20

	// Total requests = 200. Max allowed = 100.
	// We expect ~100 rejections.

	allowedCount := 0
	deniedCount := 0
	var mu sync.Mutex

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < requestsPerWorker; j++ {
				// Use same IP/Path to contend for lock
				allowed, _ := l.Allow("1.2.3.4", "/concurrent")
				mu.Lock()
				if allowed {
					allowedCount++
				} else {
					deniedCount++
				}
				mu.Unlock()
				// Tiny sleep to spread out requests slightly but still concurrent
				time.Sleep(time.Millisecond)
			}
		}()
	}

	wg.Wait()

	t.Logf("Total Allowed: %d, Total Denied: %d", allowedCount, deniedCount)

	if allowedCount > 110 { // A bit of buffer for window boundary
		t.Errorf("Allowed too many requests: %d > 100", allowedCount)
	}

	if deniedCount == 0 {
		t.Errorf("Denied zero requests, rate limiting failed under concurrency")
	}
}
