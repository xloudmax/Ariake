package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminAuthMiddleware 检查用户是否为管理员角色
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		logger := GetLogger()

		// 从上下文中以字符串形式获取用户名和角色，若未设置则返回空字符串
		username := c.GetString("username")
		role := c.GetString("role")

		// 记录管理员访问尝试
		logger.Infow("Admin access attempt",
			"username", username,
			"role", role,
			"url", c.Request.URL.Path,
			"method", c.Request.Method,
		)

		// 检查角色是否为 "ADMIN"
		if role != "ADMIN" {
			// 如果用户名为空，则使用 "anonymous"
			if username == "" {
				username = "anonymous"
			}
			logger.Warnw("Unauthorized admin access",
				"username", username,
				"role", role,
				"url", c.Request.URL.Path,
				"method", c.Request.Method,
			)
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can access this resource"})
			c.Abort()
			return
		}

		// 记录管理员访问成功
		logger.Infow("Admin access granted",
			"username", username,
			"url", c.Request.URL.Path,
			"method", c.Request.Method,
		)

		// 继续处理请求
		c.Next()
	}
}
