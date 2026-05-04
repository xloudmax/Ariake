package routes

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"repair-platform/config"
	"repair-platform/graph"
	"repair-platform/middleware"
	"repair-platform/models"
	"repair-platform/services"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"gorm.io/gorm"
)

// SetupRoutes 设置应用程序的路由和中间件（全面迁移到GraphQL）
func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config, notionService *services.NotionService, aiService *services.AIService, graphRAGService *services.GraphRAGService) {
	logger := middleware.GetLogger()
	logger.Infow("开始注册路由")

	// 注入数据库和配置
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Set("config", cfg)
		c.Next()
	})

	// 注册 DataLoader 中间件
	r.Use(graph.DataLoaderMiddleware(db))

	// 限流（基于配置）
	if cfg.RateLimitEnabled {
		r.Use(middleware.ConditionalRateLimit(time.Minute, cfg.RequestsPerMinute, "/graphql"))
		r.Use(middleware.ConditionalRateLimit(time.Hour, cfg.RequestsPerHour, "/graphql"))
	}

	// 初始化限流中间件的清理器
	middleware.CleanupExpiredVisits(10 * time.Minute)

	// 设置 GraphQL 路由（唯一接口）
	setupGraphQLRoutes(r, db, cfg, notionService, aiService)

	// 设置 OAuth 等 REST 认证路由
	setupAuthRoutes(r, db, cfg)

	// 设置 GraphRAG 路由
	setupGraphRAGRoutes(r, graphRAGService)

	// 设置上传路由
	setupUploadRoutes(r, db, cfg)

	// 设置健康检查路由
	setupHealthRoutes(r)

	logger.Infow("路由注册完成")
}

type graphSearchRequest struct {
	Query   string `json:"query"`
	MaxHops int    `json:"max_hops"`
}

func setupGraphRAGRoutes(r *gin.Engine, s *services.GraphRAGService) {
	graph := r.Group("/api/graph")
	{
		graph.POST("/search", func(c *gin.Context) {
			var req graphSearchRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			if req.MaxHops <= 0 {
				req.MaxHops = 2 // Default 2 hops
			}

			graphResult, err := s.LocalSearch(c.Request.Context(), req.Query, req.MaxHops)
			if err != nil {
				if errors.Is(err, services.ErrGraphRAGUnavailable) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GraphRAG local search is unavailable"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"query": req.Query,
				"nodes": graphResult.Nodes,
				"edges": graphResult.Edges,
			})
		})

		graph.POST("/global-search", func(c *gin.Context) {
			var req struct {
				Query string `json:"query"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			result, err := s.GlobalSearch(c.Request.Context(), req.Query)
			if err != nil {
				if errors.Is(err, services.ErrGraphRAGUnavailable) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GraphRAG service is unavailable"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"query":                  req.Query,
				"answer":                 result.Answer,
				"sections":               result.Sections,
				"format_version":         result.FormatVersion,
				"format_kind":            result.FormatKind,
				"sanitized":              result.Sanitized,
				"is_draft":               result.IsDraft,
				"supporting_communities": result.SupportingCommunities,
				"supporting_posts":       result.SupportingPosts,
				"retrieval_diagnostics":  result.RetrievalDiagnostics,
			})
		})

		graph.POST("/global-search/stream", func(c *gin.Context) {
			var req struct {
				Query string `json:"query"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			stream, err := s.StreamGlobalSearch(c.Request.Context(), req.Query)
			if err != nil {
				if errors.Is(err, services.ErrGraphRAGUnavailable) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GraphRAG service is unavailable"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			defer stream.Close()

			c.Header("Content-Type", "text/event-stream")
			c.Header("Cache-Control", "no-cache")
			c.Header("Connection", "keep-alive")
			c.Header("Transfer-Encoding", "chunked")

			c.Stream(func(w io.Writer) bool {
				_, err := io.Copy(w, stream)
				return err == nil && false
			})
		})

		graph.POST("/build-communities", func(c *gin.Context) {
			if err := s.BuildCommunities(c.Request.Context()); err != nil {
				if errors.Is(err, services.ErrGraphRAGUnavailable) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GraphRAG service is unavailable"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"status": "community building triggered"})
		})

		graph.POST("/stream", func(c *gin.Context) {
			var req struct {
				Query string `json:"query"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			stream, err := s.StreamMechanismTree(c.Request.Context(), req.Query)
			if err != nil {
				if errors.Is(err, services.ErrGraphRAGUnavailable) {
					c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GraphRAG service is unavailable"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			defer stream.Close()

			c.Header("Content-Type", "text/event-stream")
			c.Header("Cache-Control", "no-cache")
			c.Header("Connection", "keep-alive")
			c.Header("Transfer-Encoding", "chunked")

			c.Stream(func(w io.Writer) bool {
				_, err := io.Copy(w, stream)
				return err == nil && false // Always false to exit after copy
			})
		})
	}
}

// setupGraphQLRoutes 设置 GraphQL 路由（唯一接口）
func setupGraphQLRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config, notionService *services.NotionService, aiService *services.AIService) {
	logger := middleware.GetLogger()
	logger.Infow("设置 GraphQL 路由")

	// 创建 GraphQL resolver
	resolver := graph.NewResolver(db, notionService, aiService)

	// 创建 GraphQL 服务器
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	// 添加错误处理和日志记录
	srv.SetErrorPresenter(func(ctx context.Context, e error) *gqlerror.Error {
		err := graphql.DefaultErrorPresenter(ctx, e)
		err.Extensions = mergeGraphQLErrorExtensions(err.Extensions, inferGraphQLErrorCode(err.Message))
		logger.Errorw("GraphQL错误", "error", err.Message, "path", err.Path, "code", err.Extensions["code"])
		return err
	})

	srv.SetRecoverFunc(func(ctx context.Context, err interface{}) error {
		logger.Errorw("GraphQL panic", "error", err)
		return fmt.Errorf("internal server error")
	})

	// 注册 GraphQL 端点 - 添加可选JWT认证中间件
	r.POST("/graphql", middleware.OptionalJWTAuthMiddleware(), func(c *gin.Context) {
		// 将Gin上下文注入到GraphQL上下文中
		ctx := context.WithValue(c.Request.Context(), graph.GinContextKey, c)
		c.Request = c.Request.WithContext(ctx)
		srv.ServeHTTP(c.Writer, c.Request)
	})

	// 注册 GraphQL Playground（开发和测试环境）
	if cfg.IsDevelopment() || cfg.IsTest() {
		r.GET("/graphql", func(c *gin.Context) {
			playground.Handler("GraphQL", "/graphql").ServeHTTP(c.Writer, c.Request)
		})
	}

	logger.Infow("GraphQL 端点已设置", "endpoint", "/graphql")
}

// inferGraphQLErrorCode maps resolver error messages to stable client-facing codes.
func inferGraphQLErrorCode(message string) string {
	lower := strings.ToLower(message)
	switch {
	case strings.Contains(lower, "unauthorized") || strings.Contains(lower, "未授权") || strings.Contains(lower, "invalid or expired token") || strings.Contains(lower, "token expired") || strings.Contains(lower, "refresh token") || strings.Contains(lower, "无效") && strings.Contains(lower, "token"):
		return "UNAUTHENTICATED"
	case strings.Contains(lower, "权限不足") || strings.Contains(lower, "forbidden"):
		return "FORBIDDEN"
	case strings.Contains(lower, "邮箱未验证") || strings.Contains(lower, "email_not_verified") || strings.Contains(lower, "email not verified"):
		return "EMAIL_NOT_VERIFIED"
	case strings.Contains(lower, "用户名或密码错误") || strings.Contains(lower, "invalid_credentials") || strings.Contains(lower, "invalid credentials"):
		return "INVALID_CREDENTIALS"
	case strings.Contains(lower, "账户") && strings.Contains(lower, "禁用") || strings.Contains(lower, "account_disabled") || strings.Contains(lower, "account locked"):
		return "ACCOUNT_DISABLED"
	case strings.Contains(lower, "user_exists") || strings.Contains(lower, "用户已存在") || strings.Contains(lower, "用户名已存在"):
		return "USER_EXISTS"
	case strings.Contains(lower, "email_exists") || strings.Contains(lower, "邮箱已被注册"):
		return "EMAIL_EXISTS"
	case strings.Contains(lower, "validation") || strings.Contains(lower, "invalid_email") || strings.Contains(lower, "password_too_weak") || strings.Contains(lower, "username_too_short"):
		return "BAD_USER_INPUT"
	default:
		return "INTERNAL_ERROR"
	}
}

func mergeGraphQLErrorExtensions(existing map[string]any, code string) map[string]any {
	if existing == nil {
		existing = map[string]any{}
	}
	if _, ok := existing["code"]; !ok {
		existing["code"] = code
	}
	return existing
}

// getUserFromRequest 从请求中获取用户信息
func getUserFromRequest(c *gin.Context, db *gorm.DB) (*models.User, error) {
	// 从 Authorization 头获取 JWT token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("缺少 Authorization 头")
	}

	// 提取 token
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == "" {
		return nil, fmt.Errorf("无效的 Authorization 头")
	}

	// 验证 token 并获取用户信息
	claims, err := models.ParseJWT(tokenString)
	if err != nil {
		return nil, fmt.Errorf("无效的 token: %w", err)
	}

	// 获取用户 ID
	userID, ok := claims["user_id"].(float64)
	if !ok {
		return nil, fmt.Errorf("无效的用户 ID")
	}

	// 从数据库获取用户
	var user models.User
	if err := db.First(&user, uint(userID)).Error; err != nil {
		return nil, fmt.Errorf("用户不存在: %w", err)
	}

	return &user, nil
}

// setupHealthRoutes 设置健康检查路由
func setupHealthRoutes(r *gin.Engine) {
	logger := middleware.GetLogger()
	logger.Infow("设置健康检查路由")

	health := r.Group("/health")
	{
		// 基本健康检查
		health.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "service is running",
				"time":    time.Now().Unix(),
			})
		})

		// 数据库健康检查
		health.GET("/db", func(c *gin.Context) {
			db, exists := c.Get("db")
			if !exists {
				c.JSON(500, gin.H{"status": "error", "message": "database not available"})
				return
			}

			gormDB := db.(*gorm.DB)
			sqlDB, err := gormDB.DB()
			if err != nil {
				c.JSON(500, gin.H{"status": "error", "message": "database connection error"})
				return
			}

			if err := sqlDB.Ping(); err != nil {
				c.JSON(500, gin.H{"status": "error", "message": "database ping failed"})
				return
			}

			c.JSON(200, gin.H{"status": "ok", "message": "database is healthy"})
		})

		// GraphQL端点健康检查
		health.GET("/graphql", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":   "ok",
				"message":  "GraphQL endpoint is available",
				"endpoint": "/graphql",
				"playground": func() string {
					if gin.Mode() != gin.ReleaseMode {
						return "/graphql/playground"
					}
					return "disabled in production"
				}(),
			})
		})
	}

	logger.Infow("健康检查路由已设置: /health/*")
}

// setupUploadRoutes 设置文件上传路由
func setupUploadRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	logger := middleware.GetLogger()
	logger.Infow("设置文件上传路由")

	// 创建上传目录（使用配置的基础路径）
	uploadDir := filepath.Join(cfg.BasePath, "avatars")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		logger.Errorw("创建上传目录失败", "error", err)
	}

	// 上传路由组
	upload := r.Group("/api/upload")
	upload.Use(middleware.JWTAuthMiddleware()) // 需要认证
	if cfg.RateLimitEnabled {
		upload.Use(middleware.ConditionalRateLimit(time.Minute, cfg.RequestsPerMinute))
	}
	{
		// 头像上传
		upload.POST("/avatar", func(c *gin.Context) {
			handleAvatarUpload(c, db, cfg)
		})
	}

	// 静态文件服务
	r.Static("/uploads", cfg.BasePath)

	logger.Infow("文件上传路由已设置")
}

// generateFileName 生成唯一文件名
func generateFileName(ext string) string {
	// 生成随机字符串
	bytes := make([]byte, 16)
	rand.Read(bytes)
	randomStr := hex.EncodeToString(bytes)

	// 返回时间戳 + 随机字符串 + 扩展名
	return fmt.Sprintf("%d_%s%s", time.Now().Unix(), randomStr, ext)
}

// validateImageFile 验证图片文件
func validateImageFile(filename string, size int64, maxSize int64, allowed []string) error {
	// 检查文件大小
	limit := maxSize
	if limit <= 0 {
		limit = int64(5 * 1024 * 1024)
	}
	if size > limit {
		return fmt.Errorf("文件大小超过限制（%dMB）", limit/(1024*1024))
	}

	// 检查文件扩展名
	ext := strings.ToLower(filepath.Ext(filename))
	allowedExts := map[string]bool{}
	for _, v := range allowed {
		v = strings.TrimSpace(strings.ToLower(v))
		if v != "" {
			allowedExts[v] = true
		}
	}
	// fallback 默认图片类型
	if len(allowedExts) == 0 {
		allowedExts[".jpg"] = true
		allowedExts[".jpeg"] = true
		allowedExts[".png"] = true
		allowedExts[".gif"] = true
		allowedExts[".webp"] = true
	}

	if !allowedExts[ext] {
		return fmt.Errorf("不支持的文件格式，仅支持: %s", strings.Join(allowedExtsList(allowedExts), ", "))
	}

	return nil
}

func allowedExtsList(m map[string]bool) []string {
	res := make([]string, 0, len(m))
	for k := range m {
		res = append(res, k)
	}
	return res
}

// validateMimeType 验证MIME类型并返回安全扩展名
func validateMimeType(file io.Reader) (string, error) {
	// 读取文件头部来检测MIME类型
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("读取文件失败: %v", err)
	}

	// 使用 http.DetectContentType 检测
	contentType := http.DetectContentType(buffer[:n])

	// 映射 MIME 类型到安全扩展名
	allowedTypes := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/gif":  ".gif",
		"image/webp": ".webp",
	}

	ext, allowed := allowedTypes[contentType]
	if !allowed {
		return "", fmt.Errorf("不支持的文件类型: %s", contentType)
	}

	return ext, nil
}

// handleAvatarUpload 处理头像上传
func handleAvatarUpload(c *gin.Context, db *gorm.DB, cfg *config.Config) {
	logger := middleware.GetLogger()

	// 获取当前用户
	user, err := getUserFromRequest(c, db)
	if err != nil {
		c.JSON(401, gin.H{
			"success": false,
			"message": "未授权访问",
			"error":   err.Error(),
		})
		return
	}

	// 获取上传的文件
	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		logger.Errorw("获取上传文件失败", "error", err)
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取上传文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer file.Close()

	// 验证文件
	if err := validateImageFile(header.Filename, header.Size, cfg.MaxFileSize, cfg.AllowedFileTypes); err != nil {
		logger.Warnw("文件验证失败", "filename", header.Filename, "size", header.Size, "error", err)
		c.JSON(400, gin.H{
			"success": false,
			"message": "文件验证失败",
			"error":   err.Error(),
		})
		return
	}

	// 验证MIME类型
	safeExt, err := validateMimeType(file)
	if err != nil {
		logger.Warnw("MIME类型验证失败", "filename", header.Filename, "error", err)
		c.JSON(400, gin.H{
			"success": false,
			"message": "文件类型验证失败",
			"error":   err.Error(),
		})
		return
	}

	// 重置文件指针
	file.Seek(0, 0)

	// 生成新文件名 (使用安全扩展名)
	filename := generateFileName(safeExt)
	filePath := filepath.Join(cfg.BasePath, "avatars", filename)

	// 创建目标文件
	dst, err := os.Create(filePath)
	if err != nil {
		logger.Errorw("创建目标文件失败", "path", filePath, "error", err)
		c.JSON(500, gin.H{
			"success": false,
			"message": "保存文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer dst.Close()

	// 复制文件内容
	if _, err := io.Copy(dst, file); err != nil {
		logger.Errorw("复制文件失败", "error", err)
		// 删除已创建的文件
		os.Remove(filePath)
		c.JSON(500, gin.H{
			"success": false,
			"message": "保存文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成访问URL
	baseURL := c.Request.Host
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	avatarURL := fmt.Sprintf("%s://%s/%s", scheme, baseURL, filePath)

	// 删除旧头像文件（如果存在）
	if user.Avatar != "" && strings.Contains(user.Avatar, "/uploads/avatars/") {
		oldPath := strings.TrimPrefix(user.Avatar, fmt.Sprintf("%s://%s/", scheme, baseURL))
		if oldPath != filePath {
			os.Remove(oldPath)
		}
	}

	logger.Infow("头像上传成功",
		"user_id", user.ID,
		"filename", filename,
		"size", header.Size,
		"url", avatarURL,
	)

	c.JSON(200, gin.H{
		"success":  true,
		"message":  "头像上传成功",
		"url":      avatarURL,
		"filename": filename,
	})
}

func defaultOAuthRedirectTarget() string {
	if target := os.Getenv("FRONTEND_URL"); target != "" {
		return target
	}
	return "http://localhost:5173/login"
}

func sanitizeOAuthRedirectTarget(rawURL string, cfg *config.Config) string {
	fallback := defaultOAuthRedirectTarget()
	if rawURL == "" {
		return fallback
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" {
		return fallback
	}

	if parsed.Scheme == "mobile" {
		return rawURL
	}

	if cfg.IsDevelopment() && (parsed.Scheme == "exp" || strings.HasPrefix(parsed.Scheme, "exp+")) {
		return rawURL
	}

	if parsed.Scheme == "http" || parsed.Scheme == "https" {
		frontend, err := url.Parse(fallback)
		if err == nil && strings.EqualFold(parsed.Host, frontend.Host) {
			return rawURL
		}
		if cfg.IsDevelopment() && (parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1") {
			return rawURL
		}
	}

	return fallback
}

func appendQueryParam(rawURL string, values map[string]string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	query := parsed.Query()
	for key, value := range values {
		query.Set(key, value)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func randomURLSafeToken(byteLength int) (string, error) {
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// setupAuthRoutes 设置RESTful认证路由（主要用于OAuth等重定向场景）
func setupAuthRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	auth := r.Group("/api/auth")

	oauthSvc := services.NewOAuthService(db, cfg)

	auth.GET("/github/login", func(c *gin.Context) {
		redirectTarget := sanitizeOAuthRedirectTarget(c.Query("redirect"), cfg)

		state, err := randomURLSafeToken(32)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OAuth state"})
			return
		}

		secureCookie := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie("oauth_state", state, 600, "/api/auth", "", secureCookie, true)
		c.SetCookie("oauth_redirect", redirectTarget, 600, "/api/auth", "", secureCookie, true)

		oauthConfig := oauthSvc.GetGithubOAuthConfig()
		url := oauthConfig.AuthCodeURL(state)
		c.Redirect(http.StatusTemporaryRedirect, url)
	})

	// 移动端无法安全读取 httpOnly cookie 中的 OAuth 结果，因此 callback 会生成一次性 code。
	// 客户端随后通过 /api/auth/oauth/exchange 换取 token，避免 token 暴露在 URL query 中。
	auth.GET("/github/callback", func(c *gin.Context) {
		code := c.Query("code")
		state := c.Query("state")
		storedState, err := c.Cookie("oauth_state")
		if err != nil || storedState == "" || state == "" || state != storedState {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OAuth state"})
			return
		}
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code"})
			return
		}

		user, token, refreshToken, err := oauthSvc.HandleGithubCallback(c.Request.Context(), code)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		exchangeCode, err := services.CreateOAuthExchangeCode(user, token, refreshToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OAuth exchange code"})
			return
		}

		redirectTarget, err := c.Cookie("oauth_redirect")
		if err != nil || redirectTarget == "" {
			redirectTarget = defaultOAuthRedirectTarget()
		}
		redirectTarget = sanitizeOAuthRedirectTarget(redirectTarget, cfg)

		secureCookie := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
		c.SetCookie("oauth_state", "", -1, "/api/auth", "", secureCookie, true)
		c.SetCookie("oauth_redirect", "", -1, "/api/auth", "", secureCookie, true)
		c.Redirect(http.StatusTemporaryRedirect, appendQueryParam(redirectTarget, map[string]string{"code": exchangeCode}))
	})

	auth.POST("/oauth/exchange", func(c *gin.Context) {
		var req struct {
			Code string `json:"code"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code"})
			return
		}

		payload, err := services.ConsumeOAuthExchangeCode(req.Code)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OAuth code"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":        payload.Token,
			"refreshToken": payload.RefreshToken,
			"user": gin.H{
				"id":       payload.User.ID,
				"username": payload.User.Username,
				"email":    payload.User.Email,
				"role":     payload.User.Role,
				"avatar":   payload.User.Avatar,
				"bio":      payload.User.Bio,
			},
		})
	})
}
