package models

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/goccy/go-json"

	"github.com/redis/go-redis/v9"
)

// RedisCache Redis 缓存实现
type RedisCache struct {
	client *redis.Client
	ctx    context.Context
	hits   int64
	misses int64
}

// NewRedisCache 创建新的 Redis 缓存实例
func NewRedisCache(host, port, password string, db int) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:            fmt.Sprintf("%s:%s", host, port),
		Password:        password,
		DB:              db,
		MaxRetries:      0,
		MinRetryBackoff: -1,
		MaxRetryBackoff: -1,
		DialTimeout:     500 * time.Millisecond,
		ReadTimeout:     500 * time.Millisecond,
		WriteTimeout:    500 * time.Millisecond,
	})

	ctx := context.Background()

	// 检查连接
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &RedisCache{
		client: client,
		ctx:    ctx,
	}, nil
}

// Set 设置缓存项
func (r *RedisCache) Set(key string, value interface{}, duration time.Duration) {
	// 如果 value 是基本的结构体或切片，我们需要将其序列化为 JSON 字符串
	// 为了简单起见，这里假设 value 是一个可以被 json marshal 的对象，或者已经是字符串、整数等基本类型
	var storeValue interface{}

	switch v := value.(type) {
	case string, int, int64, float32, float64, bool, []byte:
		storeValue = v
	default:
		// 将复杂对象序列化为 JSON
		valBytes, err := json.Marshal(v)
		if err != nil {
			// 如果序列化失败，直接跳过或者记录日志（这里简单忽略以符合原生 Set 的行为）
			return
		}
		storeValue = valBytes
	}

	r.client.Set(r.ctx, key, storeValue, duration)
}

// Get 获取缓存项并填充到 target
func (r *RedisCache) Get(key string, target interface{}) bool {
	valBytes, err := r.client.Get(r.ctx, key).Bytes()
	if err == redis.Nil {
		atomic.AddInt64(&r.misses, 1)
		return false
	} else if err != nil {
		atomic.AddInt64(&r.misses, 1)
		return false
	}

	atomic.AddInt64(&r.hits, 1)
	if target == nil {
		return true
	}

	// 尝试反序列化到 target
	switch t := target.(type) {
	case *string:
		*t = string(valBytes)
	case *[]byte:
		*t = valBytes
	default:
		// 使用 JSON 反序列化复杂类型
		if err := json.Unmarshal(valBytes, target); err != nil {
			// 如果不是 JSON，尝试直接赋值（针对基本类型通过反射）
			return false
		}
	}

	return true
}

// Delete 删除缓存项
func (r *RedisCache) Delete(key string) {
	r.client.Del(r.ctx, key)
}

// Exists 检查缓存项是否存在
func (r *RedisCache) Exists(key string) bool {
	count, err := r.client.Exists(r.ctx, key).Result()
	if err != nil {
		return false
	}
	return count > 0
}

// Clear 清空当前 DB 缓存
func (r *RedisCache) Clear() {
	r.client.FlushDB(r.ctx)
}

// Count 获取当前数据库中的 key 数量
func (r *RedisCache) Count() int {
	count, err := r.client.DBSize(r.ctx).Result()
	if err != nil {
		return 0
	}
	return int(count)
}

// GetStats 获取缓存统计信息 (命中/未命中)
func (r *RedisCache) GetStats() (int64, int64) {
	return atomic.LoadInt64(&r.hits), atomic.LoadInt64(&r.misses)
}

// Incr 原子增加计数器
func (r *RedisCache) Incr(key string) (int64, error) {
	return r.client.Incr(r.ctx, key).Result()
}

// Stop 关闭 Redis 连接
func (r *RedisCache) Stop() {
	if r.client != nil {
		r.client.Close()
	}
}
