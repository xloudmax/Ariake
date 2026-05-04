package main

import (
	"crypto/rand"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"repair-platform/config"
	"repair-platform/database"
	"repair-platform/models"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

// create_admin: 安全地创建或重置管理员账号。
//
// 优先级（从高到低）：
//  1. CLI flags: -username, -password, -email
//  2. 环境变量: INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_EMAIL
//  3. 命令行未提供密码时——使用 crypto/rand 生成一个 24 字符的随机密码并打印一次
//
// 该工具应只在首次部署或灾难恢复时手动执行，绝不要让它进入自动化流水线。
func main() {
	var (
		flagUsername = flag.String("username", "", "管理员用户名（默认 INITIAL_ADMIN_USERNAME 或 'admin'）")
		flagPassword = flag.String("password", "", "管理员密码（默认 INITIAL_ADMIN_PASSWORD，否则随机生成）")
		flagEmail    = flag.String("email", "", "管理员邮箱（默认 INITIAL_ADMIN_EMAIL）")
		flagReset    = flag.Bool("reset", false, "若用户已存在，是否重置其密码")
	)
	flag.Parse()

	// 加载 .env（仅供本地使用；生产 systemd 走 EnvironmentFile）
	if err := godotenv.Load(); err != nil {
		log.Println("note: .env not loaded; relying on process env only")
	}

	username := pick(*flagUsername, os.Getenv("INITIAL_ADMIN_USERNAME"), "admin")
	email := pick(*flagEmail, os.Getenv("INITIAL_ADMIN_EMAIL"), username+"@local.invalid")
	password := pick(*flagPassword, os.Getenv("INITIAL_ADMIN_PASSWORD"), "")

	generated := false
	if password == "" {
		var err error
		password, err = generateRandomPassword(24)
		if err != nil {
			log.Fatalf("failed to generate random password: %v", err)
		}
		generated = true
	}
	if len(password) < 12 {
		log.Fatalf("password must be at least 12 characters")
	}

	cfg := config.GetConfig()

	dir, _ := os.Getwd()
	log.Printf("cwd=%s", dir)
	log.Printf("connecting to database (driver=%s)", driverName(cfg.DatabaseURL))

	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := upsertAdmin(db, username, email, password, *flagReset); err != nil {
		log.Fatalf("%v", err)
	}

	log.Printf("---------------------------------------------------")
	log.Printf("ADMIN ACCOUNT READY")
	log.Printf("  username: %s", username)
	log.Printf("  email:    %s", email)
	if generated {
		log.Printf("  password: %s   (generated; copy now, will not be shown again)", password)
	} else {
		log.Printf("  password: <not echoed; supplied via flag/env>")
	}
	log.Printf("---------------------------------------------------")
}

func upsertAdmin(db *gorm.DB, username, email, password string, allowReset bool) error {
	var user models.User
	res := db.Where("username = ?", username).First(&user)

	if res.Error == nil {
		// 已存在
		if !allowReset {
			return fmt.Errorf("user '%s' already exists; pass -reset to overwrite", username)
		}
		user.Email = email
		user.Role = "ADMIN"
		user.IsAdmin = true
		user.IsActive = true
		user.IsVerified = true
		if err := user.SetPassword(password); err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}
		if err := db.Save(&user).Error; err != nil {
			return fmt.Errorf("failed to update admin user: %w", err)
		}
		return nil
	}

	user = models.User{
		Username:   username,
		Email:      email,
		Role:       "ADMIN",
		IsVerified: true,
		IsActive:   true,
		IsAdmin:    true,
	}
	if err := user.SetPassword(password); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	if err := db.Create(&user).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}
	return nil
}

// generateRandomPassword 使用 crypto/rand 从 ASCII 可见字符集中均匀采样。
// 排除歧义字符（O/0/I/l/1）以方便用户首次登录手抄。
func generateRandomPassword(length int) (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*+="
	out := make([]byte, length)
	max := big.NewInt(int64(len(charset)))
	for i := range out {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		out[i] = charset[n.Int64()]
	}
	return string(out), nil
}

func pick(values ...string) string {
	for _, v := range values {
		if v = strings.TrimSpace(v); v != "" {
			return v
		}
	}
	return ""
}

func driverName(dsn string) string {
	if strings.HasPrefix(dsn, "host=") || strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return "postgres"
	}
	return "sqlite"
}
