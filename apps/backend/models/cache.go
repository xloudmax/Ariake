package models

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"reflect"
	"sync"
	"sync/atomic"
	"time"
)

// Cache 定义统一缓存接口
type Cache interface {
	Set(key string, value interface{}, duration time.Duration)
	Get(key string, target interface{}) bool
	Delete(key string)
	Exists(key string) bool
	Clear()
	Stop()
	Count() int
	Incr(key string) (int64, error)
	GetStats() (int64, int64)
}

// MemoryCache 内存缓存结构体
type MemoryCache struct {
	data    map[string]*CacheItem
	mutex   sync.RWMutex
	janitor *janitor
	hits    int64
	misses  int64
}

// CacheItem 缓存项结构体
type CacheItem struct {
	Value      interface{}
	Expiration int64
}

// janitor 清理器结构体
type janitor struct {
	interval time.Duration
	stop     chan bool
}

// NewMemoryCache 创建新的内存缓存实例
func NewMemoryCache(cleanupInterval time.Duration) *MemoryCache {
	cache := &MemoryCache{
		data: make(map[string]*CacheItem),
	}

	// 启动清理器
	if cleanupInterval > 0 {
		cache.janitor = &janitor{
			interval: cleanupInterval,
			stop:     make(chan bool),
		}
		go cache.janitor.run(cache)
	}

	return cache
}

// Set 设置缓存项
func (c *MemoryCache) Set(key string, value interface{}, duration time.Duration) {
	var expiration int64
	if duration > 0 {
		expiration = time.Now().Add(duration).UnixNano()
	}

	c.mutex.Lock()
	c.data[key] = &CacheItem{
		Value:      value,
		Expiration: expiration,
	}
	c.mutex.Unlock()
}

// Get 获取缓存项并填充到 target
func (c *MemoryCache) Get(key string, target interface{}) bool {
	c.mutex.RLock()
	item, found := c.data[key]
	if !found {
		c.mutex.RUnlock()
		atomic.AddInt64(&c.misses, 1)
		return false
	}

	if item.Expiration > 0 && time.Now().UnixNano() > item.Expiration {
		c.mutex.RUnlock()
		atomic.AddInt64(&c.misses, 1)
		c.Delete(key)
		return false
	}

	c.mutex.RUnlock()
	atomic.AddInt64(&c.hits, 1)

	// 使用反射将值拷贝到 target
	if target != nil && item.Value != nil {
		targetVal := reflect.ValueOf(target)
		if targetVal.Kind() != reflect.Ptr {
			return false // target 必须是指针
		}

		val := reflect.ValueOf(item.Value)
		// 如果 item.Value 本身也是指针，我们需要解引用或者处理类型一致性
		if val.Type().AssignableTo(targetVal.Elem().Type()) {
			targetVal.Elem().Set(val)
		} else if val.Kind() == reflect.Ptr && val.Elem().Type().AssignableTo(targetVal.Elem().Type()) {
			targetVal.Elem().Set(val.Elem())
		} else {
			// 如果类型实在不匹配，可以记录日志或返回 false
			return false
		}
	}

	return true
}

// Delete 删除缓存项
func (c *MemoryCache) Delete(key string) {
	c.mutex.Lock()
	delete(c.data, key)
	c.mutex.Unlock()
}

// Exists 检查缓存项是否存在
func (c *MemoryCache) Exists(key string) bool {
	return c.Get(key, nil)
}

// Clear 清空所有缓存
func (c *MemoryCache) Clear() {
	c.mutex.Lock()
	c.data = make(map[string]*CacheItem)
	c.mutex.Unlock()
}

// Count 获取缓存项数量
func (c *MemoryCache) Count() int {
	c.mutex.RLock()
	count := len(c.data)
	c.mutex.RUnlock()
	return count
}

// GetStats 获取缓存统计信息 (命中/未命中)
func (c *MemoryCache) GetStats() (int64, int64) {
	return atomic.LoadInt64(&c.hits), atomic.LoadInt64(&c.misses)
}

// DeleteExpired 删除过期的缓存项
func (c *MemoryCache) DeleteExpired() {
	now := time.Now().UnixNano()
	c.mutex.Lock()
	for key, item := range c.data {
		if item.Expiration > 0 && now > item.Expiration {
			delete(c.data, key)
		}
	}
	c.mutex.Unlock()
}

// Incr 原子增加计数器
func (c *MemoryCache) Incr(key string) (int64, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	item, found := c.data[key]
	if !found {
		c.data[key] = &CacheItem{
			Value:      int64(1),
			Expiration: 0,
		}
		return 1, nil
	}

	val, ok := item.Value.(int64)
	if !ok {
		// 尝试从 int 转换
		if v, ok := item.Value.(int); ok {
			val = int64(v)
		} else {
			return 0, fmt.Errorf("value is not an integer")
		}
	}

	newVal := val + 1
	item.Value = newVal
	return newVal, nil
}

// Stop 停止清理器
func (c *MemoryCache) Stop() {
	if c.janitor != nil {
		c.janitor.stop <- true
	}
}

// run 清理器运行逻辑
func (j *janitor) run(cache *MemoryCache) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			cache.DeleteExpired()
		case <-j.stop:
			return
		}
	}
}

// VerificationCode 验证码结构体
type VerificationCode struct {
	Code      string
	Email     string
	Type      string // REGISTER, LOGIN, RESET_PASSWORD
	ExpiresAt time.Time
	Used      bool
}

// EmailVerificationService 邮箱验证服务
type EmailVerificationService struct {
	cache Cache
}

// Stop 停止邮箱验证码缓存的清理器
func (evs *EmailVerificationService) Stop() {
	if evs != nil && evs.cache != nil {
		evs.cache.Stop()
	}
}

// Cache 暴露内部缓存（用于兼容旧路径）
func (evs *EmailVerificationService) Cache() Cache {
	return evs.cache
}

// NewEmailVerificationService 创建邮箱验证服务
func NewEmailVerificationService(c Cache) *EmailVerificationService {
	if c == nil {
		c = NewMemoryCache(5 * time.Minute)
	}
	return &EmailVerificationService{
		cache: c,
	}
}

// GenerateVerificationCode 生成验证码
func (evs *EmailVerificationService) GenerateVerificationCode(email, codeType string) (string, error) {
	// 生成6位数字验证码
	code := ""
	for i := 0; i < 6; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		code += num.String()
	}

	// 缓存键格式：email:type
	key := fmt.Sprintf("%s:%s", email, codeType)

	verificationCode := &VerificationCode{
		Code:      code,
		Email:     email,
		Type:      codeType,
		ExpiresAt: time.Now().Add(15 * time.Minute), // 15分钟过期
		Used:      false,
	}

	// 存储到缓存中，15分钟过期
	evs.cache.Set(key, verificationCode, 15*time.Minute)

	return code, nil
}

// VerifyCode 验证验证码
func (evs *EmailVerificationService) VerifyCode(email, code, codeType string) bool {
	key := fmt.Sprintf("%s:%s", email, codeType)

	var verificationCode VerificationCode
	found := evs.cache.Get(key, &verificationCode)
	if !found {
		return false
	}

	// 检查验证码是否正确、未使用且未过期
	if verificationCode.Code == code &&
		!verificationCode.Used &&
		time.Now().Before(verificationCode.ExpiresAt) {
		// 标记为已使用
		verificationCode.Used = true
		evs.cache.Set(key, verificationCode, time.Until(verificationCode.ExpiresAt))
		return true
	}

	return false
}

// InvalidateCode 使验证码失效
func (evs *EmailVerificationService) InvalidateCode(email, codeType string) {
	key := fmt.Sprintf("%s:%s", email, codeType)
	evs.cache.Delete(key)
}

// HasPendingCode 检查是否有待验证的验证码
func (evs *EmailVerificationService) HasPendingCode(email, codeType string) bool {
	key := fmt.Sprintf("%s:%s", email, codeType)

	var verificationCode VerificationCode
	found := evs.cache.Get(key, &verificationCode)
	if !found {
		return false
	}

	return !verificationCode.Used && time.Now().Before(verificationCode.ExpiresAt)
}

// 全局缓存实例
var (
	GlobalCache          Cache
	EmailVerificationSvc *EmailVerificationService
	once                 sync.Once
)

// InitCache 初始化缓存
func InitCache() {
	once.Do(func() {
		// 默认使用内存缓存。如果需要 Redis，在 main 中通过 SetGlobalCache 重新初始化。
		if GlobalCache == nil {
			GlobalCache = NewMemoryCache(10 * time.Minute)
		}
		if EmailVerificationSvc == nil {
			EmailVerificationSvc = NewEmailVerificationService(GlobalCache)
		}
	})
}

// SetGlobalCache 设置全局缓存实例 (由 main 调用)
func SetGlobalCache(c Cache) {
	GlobalCache = c
}

// SetEmailVerificationService 设置邮箱验证服务实例 (由 main 调用)
func SetEmailVerificationService(s *EmailVerificationService) {
	EmailVerificationSvc = s
}

// GetCache 获取全局缓存实例
func GetCache() Cache {
	if GlobalCache == nil {
		InitCache()
	}
	return GlobalCache
}

// GetEmailVerificationService 获取邮箱验证服务实例
func GetEmailVerificationService() *EmailVerificationService {
	if EmailVerificationSvc == nil {
		InitCache()
	}
	return EmailVerificationSvc
}
