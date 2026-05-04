package models

import (
	"os"
	"testing"
	"time"
)

const redisIntegrationEnv = "RUN_REDIS_INTEGRATION"

func getTestRedisCache(t *testing.T) *RedisCache {
	if os.Getenv(redisIntegrationEnv) != "1" {
		t.Skipf("%s=1 is required to run Redis integration tests", redisIntegrationEnv)
	}

	host := os.Getenv("REDIS_HOST")
	if host == "" {
		t.Skip("REDIS_HOST is not set; skipping Redis integration test")
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}
	password := os.Getenv("REDIS_PASSWORD")

	cache, err := NewRedisCache(host, port, password, 0)
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	return cache
}

func TestRedisCacheBasic(t *testing.T) {
	cache := getTestRedisCache(t)
	defer cache.Stop()

	// 清理环境
	cache.Clear()

	// 测试 Set 和 Get (String)
	key1 := "test_key_1"
	val1 := "test_value_1"
	cache.Set(key1, val1, 1*time.Minute)

	var res1 string
	if !cache.Get(key1, &res1) {
		t.Errorf("Expected key %s to exist", key1)
	}
	if res1 != val1 {
		t.Errorf("Expected value %s, got %s", val1, res1)
	}

	// 测试 Exists
	if !cache.Exists(key1) {
		t.Errorf("Expected key %s to exist", key1)
	}

	// 测试 Delete
	cache.Delete(key1)
	if cache.Exists(key1) {
		t.Errorf("Expected key %s to be deleted", key1)
	}
}

func TestRedisCacheComplexObject(t *testing.T) {
	cache := getTestRedisCache(t)
	defer cache.Stop()

	cache.Clear()

	type TestObj struct {
		Name  string `json:"name"`
		Age   int    `json:"age"`
		Flags []bool `json:"flags"`
	}

	key := "complex_obj"
	val := TestObj{
		Name:  "Gopher",
		Age:   10,
		Flags: []bool{true, false, true},
	}

	cache.Set(key, val, 1*time.Minute)

	var res TestObj
	if !cache.Get(key, &res) {
		t.Errorf("Expected key %s to exist", key)
	}

	if res.Name != val.Name || res.Age != val.Age || len(res.Flags) != len(val.Flags) {
		t.Errorf("Object mismatch. Got %+v, expected %+v", res, val)
	}
}

func TestRedisCacheExpiration(t *testing.T) {
	cache := getTestRedisCache(t)
	defer cache.Stop()

	cache.Clear()

	key := "expiring_key"
	cache.Set(key, "temp", 100*time.Millisecond)

	if !cache.Exists(key) {
		t.Errorf("Expected key to exist immediately")
	}

	// 等待过期
	time.Sleep(200 * time.Millisecond)

	if cache.Exists(key) {
		t.Errorf("Expected key to expire")
	}
}

func TestRedisCacheIntegrationWithEmailService(t *testing.T) {
	cache := getTestRedisCache(t)
	defer cache.Stop()
	cache.Clear()

	evs := NewEmailVerificationService(cache)
	email := "test@c404.cc"
	codeType := "REGISTER"

	code, err := evs.GenerateVerificationCode(email, codeType)
	if err != nil {
		t.Fatalf("Failed to generate code: %v", err)
	}

	if code == "" {
		t.Fatal("Generated code is empty")
	}

	// 验证
	if !evs.VerifyCode(email, code, codeType) {
		t.Error("Verification should succeed")
	}

	// 再次验证应失败（已标记为 Used）
	if evs.VerifyCode(email, code, codeType) {
		t.Error("Verification should fail for used code")
	}
}
