package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	_ "net/http/pprof" // registers /debug/pprof handlers on http.DefaultServeMux
	"os"
	"os/signal"
	"repair-platform/config"
	"repair-platform/database"
	"repair-platform/middleware"
	"repair-platform/models"
	"repair-platform/routes"
	"repair-platform/services"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载 .env 文件
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// 加载配置
	cfg := config.GetConfig()

	// 初始化日志
	initLogger(cfg)
	logger := middleware.GetLogger()

	// 初始化缓存 (如果启用了 Redis)
	if cfg.CacheEnabled && cfg.RedisHost != "" {
		redisCache, err := models.NewRedisCache(cfg.RedisHost, cfg.RedisPort, cfg.RedisPass, cfg.RedisDB)
		if err != nil {
			logger.Warnw("Redis连接失败，将回退到内存缓存", "error", err)
		} else {
			logger.Infow("Redis缓存已初始化", "host", cfg.RedisHost)
			models.SetGlobalCache(redisCache)
			// 更新邮箱验证服务也使用 Redis 以支持多实例同步
			models.SetEmailVerificationService(models.NewEmailVerificationService(redisCache))
		}
	}

	// 确保日志同步、缓存清理
	defer func() {
		models.GetCache().Stop()
		if models.EmailVerificationSvc != nil {
			models.EmailVerificationSvc.Stop()
		}
		if err := logger.Sync(); err != nil {
			logger.Errorw("日志同步失败", "error", err)
		}
	}()

	logger.Infow("服务初始化开始", "environment", cfg.Environment, "port", cfg.Port)

	// 设置 Gin 运行模式
	gin.SetMode(cfg.GetGinMode())

	// 初始化 Gin 引擎，避免默认日志重复输出
	r := gin.New()
	r.Use(gin.Recovery())
	// 启用 Gzip 压缩，显著减少 API 响应传输体积
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	// 注册日志中间件
	r.Use(middleware.LoggingMiddleware())

	// 配置 CORS 中间件
	setupCORS(r, cfg)

	// 初始化数据库
	logger.Infow("初始化数据库连接")
	db, err := database.InitDB(cfg)
	if err != nil {
		logger.Fatalw("数据库连接失败", "error", err)
	}
	logger.Infow("数据库连接已初始化")

	// 强制确保管理员账号存在 (用于测试和桌面端首次启动)
	ensureAdminAccount(db)

	// 初始化 Services
	logger.Infow("初始化服务")
	notionService := services.NewNotionService(db, cfg)
	if notionService == nil {
		logger.Warnw("Notion服务初始化失败 (可能是缺少 API Key)")
	} else {
		logger.Infow("Notion服务已初始化")
	}

	aiService := services.NewAIService()
	logger.Infow("AI服务已初始化")

	// 初始化专门的 GraphRAG 数据库连接 (PostgreSQL)
	graphDB, err := database.InitGraphRAGDB(cfg)
	var graphRAGService *services.GraphRAGService
	if err != nil {
		logger.Warnw("GraphRAG数据库初始化失败，功能将受限", "error", err)
		// 回退到主库 (虽然在 SQLite 下会报错，但能防止服务 crash)
		graphRAGService = services.NewGraphRAGService(db, aiService)
	} else {
		logger.Infow("GraphRAG数据库连接已建立 (PostgreSQL)")
		graphRAGService = services.NewGraphRAGService(graphDB, aiService)
	}

	// 配置路由
	logger.Infow("配置路由和中间件")
	routes.SetupRoutes(r, db, cfg, notionService, aiService, graphRAGService)

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// 启动 pprof 调试服务器（需设置 ENABLE_PPROF=true）
	if os.Getenv("ENABLE_PPROF") == "true" {
		go func() {
			logger.Infow("pprof调试服务器启动", "addr", ":6060")
			if err := http.ListenAndServe(":6060", nil); err != nil {
				logger.Warnw("pprof服务器退出", "error", err)
			}
		}()
	}

	// 启动服务器
	go startServer(server, cfg)

	// 等待关闭信号并优雅退出
	waitForShutdown(server, db)
}

func ensureAdminAccount(db *gorm.DB) {
	var admin models.User
	// 查找 admin
	err := db.Where("role = ? OR is_admin = ?", "ADMIN", true).First(&admin).Error
	if err == nil {
		// 已经存在管理员账号，不做任何处理
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Failed to query admin account: %v", err)
		return
	}

	// 没有管理员。仅在 INITIAL_ADMIN_USERNAME 和 INITIAL_ADMIN_PASSWORD 同时设置时才自动创建。
	// 这里去掉了原来硬编码 admin / admin123456 的行为——那是个公开的弱凭证。
	username := strings.TrimSpace(os.Getenv("INITIAL_ADMIN_USERNAME"))
	password := os.Getenv("INITIAL_ADMIN_PASSWORD")
	email := strings.TrimSpace(os.Getenv("INITIAL_ADMIN_EMAIL"))

	if username == "" || password == "" {
		log.Println("No admin account exists. Set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD env vars, or run `go run cmd/create_admin/main.go`, to create one.")
		return
	}

	if len(password) < 12 {
		log.Println("INITIAL_ADMIN_PASSWORD is too short (>=12 chars required); refusing to create admin account.")
		return
	}

	if email == "" {
		// 给出一个可识别的占位邮箱，但要求用户首次登录后改掉
		email = username + "@local.invalid"
	}

	now := time.Now()
	targetAdmin := models.User{
		Username:        username,
		Email:           email,
		Role:            "ADMIN",
		IsAdmin:         true,
		IsVerified:      true,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}
	if err := targetAdmin.SetPassword(password); err != nil {
		log.Printf("Failed to hash initial admin password: %v", err)
		return
	}

	if err := db.Create(&targetAdmin).Error; err != nil {
		log.Printf("Failed to create initial admin account: %v", err)
		return
	}
	log.Printf("Initial admin account created (username=%s). Rotate the password after first login.", username)
}

func initLogger(cfg *config.Config) {
	middleware.InitLogger(cfg)
}

func setupCORS(r *gin.Engine, cfg *config.Config) {
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 检查 Origin 是否在允许列表中
		allowed := false
		if origin != "" {
			for _, o := range cfg.AllowedOrigins {
				if o == "*" || o == origin {
					allowed = true
					break
				}
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin == "" {
			// 如果没带 Origin，通常是同源请求或非浏览器请求，回传 * 也是安全的 (但不能带 Credentials)
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With, apollo-require-preflight, x-apollo-operation-name, x-apollo-operation-id")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// 拦截所有 OPTIONS 请求并直接返回成功
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
}

func startServer(server *http.Server, cfg *config.Config) {
	logger := middleware.GetLogger()

	logger.Infow("服务器即将启动", "port", cfg.Port, "environment", cfg.Environment)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Fatalw("服务器启动失败", "error", err)
	}

	logger.Infow("服务器已关闭")
}

func waitForShutdown(server *http.Server, db *gorm.DB) {
	logger := middleware.GetLogger()
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	<-c
	logger.Infow("接收到关闭信号，正在清理资源")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Errorw("服务器优雅关闭失败", "error", err)
	}

	database.CloseDB(db)
	logger.Infow("资源清理完成，应用退出")
}
