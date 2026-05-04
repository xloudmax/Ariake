package middleware

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"repair-platform/config"

	"github.com/gin-gonic/gin"
	"github.com/natefinch/lumberjack"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var globalLogger *zap.SugaredLogger

// resolveLogLevel 从配置解析日志级别
func resolveLogLevel(cfg *config.Config) zapcore.Level {
	level := zapcore.InfoLevel
	if cfg == nil {
		return level
	}

	if levelStr, ok := cfg.GetLogConfig()["level"].(string); ok {
		if parsed, err := zapcore.ParseLevel(levelStr); err == nil {
			level = parsed
		}
	}
	return level
}

// resolveLogFormat 从配置解析日志格式
func resolveLogFormat(cfg *config.Config) string {
	if cfg == nil {
		return "json"
	}
	if format, ok := cfg.GetLogConfig()["format"].(string); ok {
		return format
	}
	return "json"
}

// InitLogger 初始化日志记录器，并转换为 SugaredLogger
func InitLogger(cfg *config.Config) {
	logLevel := resolveLogLevel(cfg)
	format := resolveLogFormat(cfg)

	// 为终端和文件创建不同的编码器
	consoleEncoder := getConsoleEncoder() // 美化的控制台编码器
	fileEncoder := getFileEncoder(format == "console")

	// 获取写入器
	logDir := "logs"
	logFile := &lumberjack.Logger{
		Filename:   filepath.Join(logDir, "server.log"),
		MaxSize:    10,
		MaxBackups: 3,
		MaxAge:     7,
		Compress:   true,
	}

	// 创建日志目录
	if err := os.MkdirAll(filepath.Dir(logFile.Filename), os.ModePerm); err != nil {
		zap.S().Warn("日志目录创建失败", zap.Error(err))
	}

	consoleLevel := logLevel
	if cfg != nil && cfg.IsProduction() {
		consoleLevel = zapcore.WarnLevel // 生产环境降低控制台日志等级
	}

	consoleCore := zapcore.NewCore(consoleEncoder, zapcore.AddSync(os.Stdout), consoleLevel)
	fileCore := zapcore.NewCore(fileEncoder, zapcore.AddSync(logFile), logLevel)

	// 合并两个 core
	core := zapcore.NewTee(consoleCore, fileCore)

	baseLogger := zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))
	globalLogger = baseLogger.Sugar() // 转换为 SugaredLogger
}

// InitTestLogger 初始化测试环境日志记录器
func InitTestLogger() {
	// 测试环境使用更简单的配置
	config := zap.NewDevelopmentConfig()
	config.Level = zap.NewAtomicLevelAt(zapcore.ErrorLevel) // 只输出错误日志
	config.DisableCaller = true
	config.DisableStacktrace = true

	logger, err := config.Build()
	if err != nil {
		panic(fmt.Sprintf("初始化测试日志记录器失败: %v", err))
	}

	globalLogger = logger.Sugar()
}

// GetLogger 获取全局的 SugaredLogger 实例
func GetLogger() *zap.SugaredLogger {
	if globalLogger == nil {
		InitLogger(config.GetConfig())
	}
	return globalLogger
}

// LoggingMiddleware 是 Gin 的日志中间件，使用 SugaredLogger 记录美化的日志
func LoggingMiddleware() gin.HandlerFunc {
	log := GetLogger()
	return func(c *gin.Context) {
		c.Set("logger", log) // 直接存储 SugaredLogger 到上下文

		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		userAgent := c.Request.UserAgent()

		// 根据状态码选择日志级别和颜色
		if len(c.Errors) > 0 {
			log.Errorw("😭 请求失败",
				"status", status,
				"method", method,
				"path", path,
				"query", query,
				"ip", clientIP,
				"latency", latency.String(),
				"user_agent", userAgent,
				"errors", c.Errors.ByType(gin.ErrorTypePrivate).String(),
			)
		} else {
			// 根据状态码选择不同的 emoji 和日志级别
			var emoji string
			switch {
			case status >= 500:
				emoji = "🔥" // 服务器错误
			case status >= 400:
				emoji = "⚠️" // 客户端错误
			case status >= 300:
				emoji = "🔄" // 重定向
			case status >= 200:
				emoji = "✅" // 成功
			default:
				emoji = "📝" // 信息
			}

			// 根据路径类型显示不同信息
			var pathType string
			switch {
			case path == "/graphql/playground":
				pathType = "GraphQL Playground"
			case path == "/graphql" || path == "/graphql/auth/query" || path == "/graphql/admin/query":
				pathType = "GraphQL API"
			case method == "GET" && (path == "/api/admin/dashboard" || path == "/api/admin/users"):
				pathType = "Admin API"
			case method == "POST" && (path == "/api/register" || path == "/api/login"):
				pathType = "Auth API"
			case method == "POST" && path == "/api/upload/image":
				pathType = "Upload API"
			default:
				pathType = "API"
			}

			if status >= 400 {
				log.Warnw(emoji+" "+pathType+" 请求",
					"status", status,
					"method", method,
					"path", path,
					"query", query,
					"ip", clientIP,
					"latency", latency.String(),
					"user_agent", userAgent,
				)
			} else {
				log.Infow(emoji+" "+pathType+" 请求",
					"status", status,
					"method", method,
					"path", path,
					"query", query,
					"ip", clientIP,
					"latency", latency.String(),
				)
			}
		}
	}
}

// getConsoleEncoder 返回美化的控制台日志编码器
func getConsoleEncoder() zapcore.Encoder {
	encoderConfig := zap.NewDevelopmentEncoderConfig()
	encoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05")
	encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder // 彩色级别
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder      // 短路径调用者
	encoderConfig.ConsoleSeparator = " | "                       // 分隔符
	return zapcore.NewConsoleEncoder(encoderConfig)
}

// getFileEncoder 返回 JSON 或控制台格式的文件日志编码器
func getFileEncoder(preferConsole bool) zapcore.Encoder {
	if preferConsole {
		return getConsoleEncoder()
	}

	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.LowercaseLevelEncoder
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
	return zapcore.NewJSONEncoder(encoderConfig)
}
