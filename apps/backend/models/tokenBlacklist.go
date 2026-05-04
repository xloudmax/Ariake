package models

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenBlacklist JWT令牌黑名单管理器
// 用于在以下场景撤销已签发的JWT：
// 1. 用户主动登出
// 2. 管理员强制登出用户
// 3. 密码重置后撤销所有旧token
// 4. 检测到可疑活动
type TokenBlacklist struct {
	cache Cache
	mutex sync.RWMutex
}

var (
	// 全局单例
	blacklistInstance *TokenBlacklist
	blacklistOnce     sync.Once
)

// GetTokenBlacklist 获取黑名单单例实例
func GetTokenBlacklist() *TokenBlacklist {
	blacklistOnce.Do(func() {
		blacklistInstance = &TokenBlacklist{
			// 每5分钟清理一次过期的黑名单项
			cache: NewMemoryCache(5 * time.Minute),
		}
	})
	return blacklistInstance
}

// AddToBlacklist 将JWT token添加到黑名单
// tokenString: 原始JWT字符串
// reason: 撤销原因（如"logout", "password_reset", "security_violation"等）
func (tb *TokenBlacklist) AddToBlacklist(tokenString string, reason string) error {
	// 1. 解析JWT获取过期时间
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(GetSecretKey()), nil
	})
	if err != nil {
		// 即使解析失败也加入黑名单（可能是格式错误的token）
		tb.addTokenHash(tokenString, reason, 24*time.Hour) // 默认保留24小时
		return nil
	}

	// 2. 提取过期时间
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return fmt.Errorf("无效的JWT claims")
	}

	exp, ok := claims["exp"].(float64)
	if !ok {
		// 没有过期时间的token，使用默认过期时间
		tb.addTokenHash(tokenString, reason, 7*24*time.Hour)
		return nil
	}

	// 3. 计算还需要在黑名单中保留多久
	expiryTime := time.Unix(int64(exp), 0)
	remainingDuration := time.Until(expiryTime)

	// 如果token已经过期，不需要加入黑名单
	if remainingDuration <= 0 {
		return nil
	}

	// 4. 添加到黑名单（保留到token自然过期）
	tb.addTokenHash(tokenString, reason, remainingDuration)

	return nil
}

// addTokenHash 添加token的哈希值到黑名单
func (tb *TokenBlacklist) addTokenHash(tokenString string, reason string, duration time.Duration) {
	// 对token进行SHA256哈希（节省内存，避免存储完整token）
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := base64.URLEncoding.EncodeToString(hash[:])

	tb.mutex.Lock()
	defer tb.mutex.Unlock()

	// 存储黑名单项
	blacklistEntry := map[string]interface{}{
		"reason":         reason,
		"blacklisted_at": time.Now(),
	}

	// 使用过期时间自动清理
	tb.cache.Set(tokenHash, blacklistEntry, duration)
}

// IsBlacklisted 检查token是否在黑名单中
func (tb *TokenBlacklist) IsBlacklisted(tokenString string) bool {
	if tokenString == "" {
		return false
	}

	// 计算token的哈希值
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := base64.URLEncoding.EncodeToString(hash[:])

	tb.mutex.RLock()
	defer tb.mutex.RUnlock()

	found := tb.cache.Get(tokenHash, nil)
	return found
}

// GetBlacklistInfo 获取黑名单信息（用于调试）
func (tb *TokenBlacklist) GetBlacklistInfo(tokenString string) (map[string]interface{}, bool) {
	hash := sha256.Sum256([]byte(tokenString))
	tokenHash := base64.URLEncoding.EncodeToString(hash[:])

	tb.mutex.RLock()
	defer tb.mutex.RUnlock()

	var infoMap map[string]interface{}
	exists := tb.cache.Get(tokenHash, &infoMap)
	if !exists {
		return nil, false
	}

	return infoMap, true
}

// RevokeAllUserTokens 撤销用户的所有JWT token（通过添加用户ID到黑名单）
// 注意：这需要在JWT claims中包含user_id，并在验证时检查
func (tb *TokenBlacklist) RevokeAllUserTokens(userID uint, reason string) {
	tb.mutex.Lock()
	defer tb.mutex.Unlock()

	// 使用特殊的key格式标记用户的所有token被撤销
	key := fmt.Sprintf("user_revoke_%d", userID)

	revokeInfo := map[string]interface{}{
		"reason":     reason,
		"revoked_at": time.Now(),
		"user_id":    userID,
	}

	// 保留30天（足够长以覆盖所有可能的token）
	tb.cache.Set(key, revokeInfo, 30*24*time.Hour)
}

// IsUserRevoked 检查用户的所有token是否被全局撤销
func (tb *TokenBlacklist) IsUserRevoked(userID uint, tokenIssuedAt time.Time) bool {
	tb.mutex.RLock()
	defer tb.mutex.RUnlock()

	key := fmt.Sprintf("user_revoke_%d", userID)
	var infoMap map[string]interface{}
	exists := tb.cache.Get(key, &infoMap)
	if !exists {
		return false
	}

	// 检查token的签发时间是否早于撤销时间
	revokedAt, ok := infoMap["revoked_at"].(time.Time)
	if !ok {
		return false
	}

	// 如果token是在撤销之前签发的，则视为被撤销
	return tokenIssuedAt.Before(revokedAt)
}

// ClearUserRevocation 清除用户的全局撤销状态（用于密码重置后）
func (tb *TokenBlacklist) ClearUserRevocation(userID uint) {
	tb.mutex.Lock()
	defer tb.mutex.Unlock()

	key := fmt.Sprintf("user_revoke_%d", userID)
	tb.cache.Delete(key)
}

// GetStats 获取黑名单统计信息
func (tb *TokenBlacklist) GetStats() map[string]interface{} {
	tb.mutex.RLock()
	defer tb.mutex.RUnlock()

	// 注意：这个实现依赖于MemoryCache有一个Count()方法
	// 如果没有，我们需要添加一个
	return map[string]interface{}{
		"message": "黑名单统计功能需要MemoryCache实现Count()方法",
	}
}

// CleanExpired 清理过期的黑名单项（通常由定时任务调用）
// 注意：MemoryCache 已经有自动清理机制，这个方法是可选的
func (tb *TokenBlacklist) CleanExpired() {
	// MemoryCache 的 janitor 会自动清理过期项
	// 这里可以添加额外的清理逻辑或日志记录
}

// VerifyTokenWithBlacklist 验证token是否有效且未被撤销
// 这是一个辅助函数，结合了JWT验证和黑名单检查
func VerifyTokenWithBlacklist(tokenString string) (jwt.MapClaims, error) {
	// 1. 检查黑名单
	blacklist := GetTokenBlacklist()
	if blacklist.IsBlacklisted(tokenString) {
		return nil, fmt.Errorf("token已被撤销")
	}

	// 2. 解析并验证JWT
	claims, err := ParseJWT(tokenString)
	if err != nil {
		return nil, err
	}

	// 3. 提取user_id和签发时间
	userID, ok := claims["user_id"].(float64)
	if !ok {
		return nil, fmt.Errorf("无效的user_id")
	}

	iat, ok := claims["iat"].(float64)
	if !ok {
		return nil, fmt.Errorf("无效的签发时间")
	}

	issuedAt := time.Unix(int64(iat), 0)

	// 4. 检查用户是否被全局撤销
	if blacklist.IsUserRevoked(uint(userID), issuedAt) {
		return nil, fmt.Errorf("用户的所有token已被撤销")
	}

	return claims, nil
}
