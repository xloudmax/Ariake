package config

import (
	"os"
	"strconv"
	"strings"
	"sync"
)

// 全局配置实例
var (
	configInstance *Config
	configOnce     sync.Once
)

// Config 应用配置
type Config struct {
	// 基础配置
	Environment string
	Port        string
	LogLevel    string

	// 数据库配置
	DatabaseURL string

	// JWT 配置
	JWTSecret      string
	BcryptCost     int
	SessionTimeout string
	RefreshTimeout string

	// 邮件配置
	EmailEnabled bool
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string

	// CORS 配置
	AllowedOrigins []string

	// 文件上传配置
	BasePath         string
	MaxFileSize      int64
	AllowedFileTypes []string

	// 限流配置
	RateLimitEnabled  bool
	RequestsPerMinute int
	RequestsPerHour   int

	// 缓存配置
	CacheEnabled bool
	CacheTTL     string
	RedisHost    string
	RedisPort    string
	RedisPass    string
	RedisDB      int

	// AI 服务配置
	AIServiceURL     string
	AIServiceTimeout string

	// GitHub OAuth 配置
	GithubClientID     string
	GithubClientSecret string
	GithubRedirectURL  string

	// GraphRAG 配置
	GraphRAGDSN string

	// Notion 服务配置
	NotionAPIKey string
}

// LoadConfig 加载应用配置
func LoadConfig() *Config {
	// 默认数据库和上传路径
	defaultDB := "blog_platform.db"
	defaultUploads := "uploads"

	// 如果需要，可以在这里保留对特定环境的路径处理，但不再强制重定向到 ~/.c404-blog
	cfg := &Config{
		// 基础配置
		Environment: getEnv("GIN_MODE", "development"),
		Port:        getEnv("PORT", "11451"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),

		// 数据库配置
		DatabaseURL: getEnv("DATABASE_URL", defaultDB),

		// JWT 配置
		JWTSecret:      getEnv("JWT_SECRET", ""),
		BcryptCost:     getEnvAsInt("BCRYPT_COST", 12),
		SessionTimeout: getEnv("SESSION_TIMEOUT", "24h"),
		RefreshTimeout: getEnv("REFRESH_TOKEN_TIMEOUT", "168h"),

		// 邮件配置
		EmailEnabled: getEnvAsBool("EMAIL_ENABLED", false),
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),

		// CORS 配置
		AllowedOrigins: getEnvAsSlice("ALLOWED_ORIGINS", "http://localhost:5173", ","),

		// 文件上传配置
		BasePath:         getEnv("BASE_PATH", defaultUploads),
		MaxFileSize:      getEnvAsInt64("MAX_FILE_SIZE", 10485760), // 10MB
		AllowedFileTypes: getEnvAsSlice("ALLOWED_FILE_TYPES", ".md,.txt,.json,.jpg,.jpeg,.png,.gif,.webp", ","),

		// 限流配置
		RateLimitEnabled:  getEnvAsBool("RATE_LIMIT_ENABLED", true),
		RequestsPerMinute: getEnvAsInt("REQUESTS_PER_MINUTE", 100),
		RequestsPerHour:   getEnvAsInt("REQUESTS_PER_HOUR", 1000),

		// 缓存配置
		CacheEnabled: getEnvAsBool("CACHE_ENABLED", true),
		CacheTTL:     getEnv("CACHE_TTL", "900s"),
		RedisHost:    getEnv("REDIS_HOST", ""), // 空代表使用本地 go-cache
		RedisPort:    getEnv("REDIS_PORT", "6379"),
		RedisPass:    getEnv("REDIS_PASSWORD", ""),
		RedisDB:      getEnvAsInt("REDIS_DB", 0),

		// AI 服务配置
		AIServiceURL:     getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		AIServiceTimeout: getEnv("AI_SERVICE_TIMEOUT", "150s"),

		// GitHub OAuth 配置
		GithubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GithubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		GithubRedirectURL:  getEnv("GITHUB_REDIRECT_URL", "http://localhost:11451/api/auth/github/callback"),

		// GraphRAG 配置
		GraphRAGDSN: getEnv("POSTGRES_DSN", ""),

		// Notion 服务配置
		NotionAPIKey: getEnv("NOTION_API_KEY", ""),
	}

	// 安全检查：生产环境下必须配置 JWT_SECRET
	if cfg.JWTSecret == "" {
		if cfg.IsProduction() {
			panic("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set. Refusing to start in production. See apps/backend/.env.example.")
		}
		// 开发环境给一个默认的不安全密钥，防止 crash
		if cfg.IsDevelopment() || cfg.IsTest() {
			cfg.JWTSecret = "dev_unsafe_secret_do_not_use_in_prod"
		}
	}

	// 安全检查：拒绝任何已知的、曾经被提交进仓库的弱默认值。
	// 这些字面值无论环境都不允许使用——它们已经出现在公共 git 历史里。
	rejectedSecrets := map[string]struct{}{
		"JNU_technicians_club":          {}, // 旧的硬编码默认值
		"your-super-secret-jwt-key-change-in-production": {}, // docker-compose.yml 占位符
	}
	if _, bad := rejectedSecrets[cfg.JWTSecret]; bad {
		panic("CRITICAL SECURITY ERROR: JWT_SECRET is set to a known leaked / placeholder literal. Pick a fresh random value (>=32 chars). See apps/backend/.env.example.")
	}

	// 安全检查：JWT secret 长度。生产环境下要求 >=32 字符；开发环境放宽。
	if cfg.IsProduction() && len(cfg.JWTSecret) < 32 {
		panic("CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in production.")
	}

	// 安全检查：bcrypt cost 不能太低。bcrypt 要求 4..31，OWASP 推荐 >=10。
	if cfg.BcryptCost < 10 {
		if cfg.IsProduction() {
			panic("CRITICAL SECURITY ERROR: BCRYPT_COST must be >= 10 in production (OWASP recommendation).")
		}
		// 开发环境只警告（用 stderr，logger 此时还没初始化）。
		_, _ = os.Stderr.WriteString("WARN: BCRYPT_COST is below 10; OK for dev/test, NOT for production.\n")
	}

	return cfg
}

// GetGinMode 获取 Gin 运行模式（映射到 Gin 支持的模式）
func (c *Config) GetGinMode() string {
	switch c.Environment {
	case "production":
		return "release"
	case "test":
		return "test"
	default: // development, debug 等都映射为 debug
		return "debug"
	}
}

// GetConfig 获取全局配置实例（单例模式）
func GetConfig() *Config {
	configOnce.Do(func() {
		configInstance = LoadConfig()
	})
	return configInstance
}

// IsProduction 检查是否为生产环境
func (c *Config) IsProduction() bool {
	return c.Environment == "production" || c.Environment == "release"
}

// IsDevelopment 检查是否为开发环境
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development" || c.Environment == "debug"
}

// IsTest 检查是否为测试环境
func (c *Config) IsTest() bool {
	return c.Environment == "test"
}

// ShouldSkipEmailVerification 是否跳过邮箱验证
func (c *Config) ShouldSkipEmailVerification() bool {
	return c.IsTest() || c.IsDevelopment() || !c.EmailEnabled
}

// GetDatabaseConfig 获取数据库配置
func (c *Config) GetDatabaseConfig() map[string]interface{} {
	config := make(map[string]interface{})

	if c.IsTest() {
		config["dsn"] = ":memory:"
		config["driver"] = "sqlite"
	} else {
		config["dsn"] = c.DatabaseURL
		if strings.HasPrefix(c.DatabaseURL, "postgres://") || strings.HasPrefix(c.DatabaseURL, "host=") {
			config["driver"] = "postgres"
		} else {
			config["driver"] = "sqlite"
		}
	}

	return config
}

// GetLogConfig 获取日志配置
func (c *Config) GetLogConfig() map[string]interface{} {
	config := make(map[string]interface{})

	config["level"] = c.LogLevel
	config["format"] = "json"

	if c.IsDevelopment() {
		config["format"] = "console"
		config["level"] = "debug"
	}

	if c.IsTest() {
		config["level"] = "error"
	}

	return config
}

// GetCORSConfig 获取CORS配置
func (c *Config) GetCORSConfig() map[string]interface{} {
	config := make(map[string]interface{})

	config["allowed_origins"] = c.AllowedOrigins
	config["allowed_methods"] = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config["allowed_headers"] = []string{"Origin", "Content-Type", "Authorization"}
	config["allow_credentials"] = true

	if c.IsDevelopment() {
		config["allowed_origins"] = []string{"*"}
	}

	return config
}

// GetRateLimitConfig 获取限流配置
func (c *Config) GetRateLimitConfig() map[string]interface{} {
	config := make(map[string]interface{})

	if c.IsTest() {
		config["enabled"] = false
	} else if c.IsDevelopment() {
		config["enabled"] = true
		config["requests_per_minute"] = 1000
		config["requests_per_hour"] = 10000
	} else {
		config["enabled"] = true
		config["requests_per_minute"] = 60
		config["requests_per_hour"] = 1000
	}

	return config
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		return strings.ToLower(value) == "true"
	}
	return defaultValue
}

func getEnvAsSlice(key, defaultValue, sep string) []string {
	if value, exists := os.LookupEnv(key); exists {
		return strings.Split(value, sep)
	}
	return strings.Split(defaultValue, sep)
}

func getEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}
