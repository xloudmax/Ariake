package database

import (
	"fmt"
	"log"
	"os"
	"repair-platform/config"
	"repair-platform/middleware"
	"repair-platform/models"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// InitDB 初始化数据库连接并自动迁移模型
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	// 自定义日志配置
	newLogger := gormLogger.New(
		log.New(os.Stdout, "gorm: ", log.LstdFlags), // io writer
		gormLogger.Config{
			SlowThreshold: time.Second,       // 慢 SQL 阈值
			LogLevel:      gormLogger.Silent, // 不输出 SQL 日志
			Colorful:      true,              // 启用彩色打印
		},
	)

	// 配置数据库连接选项
	dbConfig := cfg.GetDatabaseConfig()
	dsn := dbConfig["dsn"].(string)
	driver := dbConfig["driver"].(string)

	var dialector gorm.Dialector
	if driver == "postgres" {
		dialector = postgres.Open(dsn)
	} else {
		dialector = sqlite.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: newLogger,
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true, // 使用单数表名
		},
		PrepareStmt: false, // 关闭预编译语句缓存，避免 SQLite 下的 database locks
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// 获取底层 sql.DB 对象以设置连接池参数
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	if driver == "postgres" {
		// PostgreSQL 高并发连接池配置
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetMaxIdleConns(20)
		sqlDB.SetConnMaxLifetime(time.Hour)
	} else {
		// 强制开启 WAL 模式 (Write-Ahead Logging) 提升并发读写性能
		db.Exec("PRAGMA journal_mode=WAL;")
		db.Exec("PRAGMA synchronous=NORMAL;")
		db.Exec("PRAGMA busy_timeout=5000;")

		// SQLite 推荐配置
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// 运行数据库迁移和索引创建
	if err := RunMigrations(db); err != nil {
		logger := middleware.GetLogger()
		logger.Errorw("数据库迁移失败", "error", err)
		return nil, fmt.Errorf("数据库迁移失败: %v", err)
	}

	// 初始化缓存系统
	models.InitCache()

	middleware.GetLogger().Infow("Database connection and migration successful.")
	return db, nil
}

// InitTestDB 初始化测试数据库（内存数据库）
func InitTestDB() (*gorm.DB, error) {
	// 测试环境使用静默模式
	newLogger := gormLogger.New(
		log.New(os.Stdout, "test-gorm: ", log.LstdFlags),
		gormLogger.Config{
			SlowThreshold: time.Second,
			LogLevel:      gormLogger.Silent, // 测试环境不输出日志
			Colorful:      false,
		},
	)

	// 使用内存SQLite数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: newLogger,
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to test database: %w", err)
	}

	// 运行数据库迁移和索引创建 (使用统一的 RunMigrations)
	if err := RunMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to migrate test database: %w", err)
	}

	return db, nil
}

// InitGraphRAGDB 初始化专门用于 GraphRAG 的 PostgreSQL 连接
func InitGraphRAGDB(cfg *config.Config) (*gorm.DB, error) {
	if cfg.GraphRAGDSN == "" {
		return nil, fmt.Errorf("GraphRAGDSN is not configured")
	}

	db, err := gorm.Open(postgres.Open(cfg.GraphRAGDSN), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to GraphRAG database: %w", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetMaxIdleConns(10)
	}

	// 必须执行迁移，因为本地开发时主 DB 是 SQLite，导致 Postgres 专用的 Graph 迁移被跳过
	if err := RunMigrations(db); err != nil {
		middleware.GetLogger().Errorw("GraphRAG database migration failed", "error", err)
		return nil, fmt.Errorf("failed to migrate GraphRAG db: %w", err)
	}

	return db, nil
}

// CloseDB 关闭数据库连接
func CloseDB(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		middleware.GetLogger().Errorw("Failed to retrieve generic database object", "error", err)
		return
	}

	if err := sqlDB.Close(); err != nil {
		middleware.GetLogger().Errorw("Failed to close database", "error", err)
	} else {
		middleware.GetLogger().Infow("Database connection closed successfully.")
	}
}
