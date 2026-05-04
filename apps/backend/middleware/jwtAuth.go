package middleware

import (
	"errors"
	"net/http"
	"repair-platform/config"
	"repair-platform/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// 定义 JWT 密钥获取函数
func getJWTSecret() []byte {
	cfg := config.GetConfig()
	return []byte(cfg.JWTSecret)
}

// JWTAuthMiddleware 验证 JWT 并提取用户信息，检查 token 是否过期、签名是否正确
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		logger := GetLogger()

		// 从请求头中获取 Authorization 字段，预期格式 "Bearer <token>"
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			logger.Warnw("Authorization token not provided or invalid", "header", authHeader)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token not provided or invalid"})
			c.Abort()
			return
		}

		// 提取实际的 token 字符串
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// 1. 检查token是否在黑名单中
		blacklist := models.GetTokenBlacklist()
		if blacklist.IsBlacklisted(tokenString) {
			logger.Warnw("Token is blacklisted", "token_prefix", tokenString[:min(10, len(tokenString))])
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked"})
			c.Abort()
			return
		}

		// 2. 解析 token，回调函数用于验证签名方法及返回验证密钥
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// 确保使用 HMAC 签名方法
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				logger.Errorw("Unexpected signing method", "method", token.Header["alg"])
				return nil, errors.New("unexpected signing method") // 修复：使用标准error
			}
			return getJWTSecret(), nil
		})
		if err != nil || !token.Valid {
			logger.Errorw("Invalid or expired token", "error", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// 提取 token 中的 claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			logger.Errorw("Invalid JWT claims", "claims", token.Claims)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid JWT claims"})
			c.Abort()
			return
		}

		// 检查必需的 claim：user_id, username 和 role
		userIDFloat, userIDOk := claims["user_id"].(float64)
		username, usernameOk := claims["username"]
		role, roleOk := claims["role"]

		if !userIDOk {
			logger.Warnw("User ID not found in token", "claims", claims)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
			c.Abort()
			return
		}
		if !usernameOk {
			logger.Warnw("Username not found in token", "claims", claims)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username not found in token"})
			c.Abort()
			return
		}
		if !roleOk {
			logger.Warnw("Role not found in token", "claims", claims)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Role not found in token"})
			c.Abort()
			return
		}

		// 可选：检查 token 是否过期（若包含 exp 字段）
		if exp, ok := claims["exp"].(float64); ok {
			if int64(exp) < time.Now().Unix() {
				logger.Warnw("Token expired", "exp", exp)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
				c.Abort()
				return
			}
		}

		// 3. 检查用户的token是否被全局撤销（如密码重置后）
		if iat, ok := claims["iat"].(float64); ok {
			issuedAt := time.Unix(int64(iat), 0)
			if blacklist.IsUserRevoked(uint(userIDFloat), issuedAt) {
				logger.Warnw("User tokens globally revoked", "user_id", uint(userIDFloat), "issued_at", issuedAt)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked due to security reasons"})
				c.Abort()
				return
			}
		}

		// 如果需要邮箱验证，则校验用户是否已验证
		if !config.GetConfig().ShouldSkipEmailVerification() {
			if db, ok := getDBFromContext(c); ok {
				var user models.User
				if err := db.First(&user, uint(userIDFloat)).Error; err != nil {
					logger.Warnw("User not found during token validation", "error", err)
					c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
					c.Abort()
					return
				}
				if !user.IsVerified {
					logger.Warnw("Unverified user blocked", "user_id", user.ID)
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Email not verified"})
					c.Abort()
					return
				}
			}
		}

		// 存储用户信息到上下文，供后续处理中使用
		userID := uint(userIDFloat)
		c.Set("user_id", userID)
		c.Set("username", username)
		c.Set("role", role)
		logger.Infow("JWT token validated", "user_id", userID, "username", username, "role", role)

		// 继续处理请求
		c.Next()
	}
}

// OptionalJWTAuthMiddleware 可选的JWT认证中间件，如果提供了token则验证，否则继续处理
func OptionalJWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		logger := GetLogger()

		// 从请求头中获取 Authorization 字段
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			// 没有提供token，直接继续处理
			c.Next()
			return
		}

		// 提取实际的 token 字符串
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// 解析 token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method") // 修复：使用标准error
			}
			return getJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			// token无效，记录警告但继续处理
			logger.Warnw("Invalid optional token provided", "error", err)
			c.Next()
			return
		}

		// 提取 token 中的 claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			if userIDFloat, userIDOk := claims["user_id"].(float64); userIDOk {
				userID := uint(userIDFloat)
				c.Set("user_id", userID)
				if db, ok := getDBFromContext(c); ok {
					var user models.User
					if err := db.First(&user, userID).Error; err == nil {
						c.Set("is_verified", user.IsVerified)
						if !config.GetConfig().ShouldSkipEmailVerification() && !user.IsVerified {
							logger.Warnw("Optional token from unverified user", "user_id", user.ID)
							c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Email not verified"})
							return
						}
					}
				}
			}
			if username, usernameOk := claims["username"]; usernameOk {
				c.Set("username", username)
			}
			if role, roleOk := claims["role"]; roleOk {
				c.Set("role", role)
			}
			logger.Infow("Optional JWT token validated", "username", claims["username"], "role", claims["role"])
		}

		// 继续处理请求
		c.Next()
	}
}

// getDBFromContext 提取数据库实例
func getDBFromContext(c *gin.Context) (*gorm.DB, bool) {
	dbRaw, exists := c.Get("db")
	if !exists {
		return nil, false
	}
	db, ok := dbRaw.(*gorm.DB)
	return db, ok
}

// GetUserFromContext 从Gin上下文中获取当前用户信息
func GetUserFromContext(c *gin.Context) (userID uint, username string, role string, exists bool) {
	userIDRaw, userIDExists := c.Get("user_id")
	usernameRaw, usernameExists := c.Get("username")
	roleRaw, roleExists := c.Get("role")

	if !userIDExists || !usernameExists || !roleExists {
		return 0, "", "", false
	}

	userID, userIDOk := userIDRaw.(uint)
	username, usernameOk := usernameRaw.(string)
	role, roleOk := roleRaw.(string)

	if !userIDOk || !usernameOk || !roleOk {
		return 0, "", "", false
	}

	return userID, username, role, true
}

// IsAdmin 检查当前用户是否为管理员
func IsAdmin(c *gin.Context) bool {
	_, _, role, exists := GetUserFromContext(c)
	return exists && (role == "admin" || role == "ADMIN")
}


