#!/bin/bash
# 环境变量设置脚本
# 使用方法: source apps/backend/set_env.sh

echo "🔐 设置博客平台环境变量..."

# 基础配置
export GIN_MODE="debug"
export PORT="11451"
export LOG_LEVEL="info"

# 数据库配置
export DATABASE_URL="blog_platform.db"

# Go 编译配置：开启 SQLite FTS5 支持，确保全文索引可用
export GOFLAGS="-tags=fts5"

# JWT 安全密钥 (已生成强随机密钥)
export JWT_SECRET="X5cIMqG0p7tqKlSPvx408x660KtbtXsdzwCYdjJWn09bJwY2Fpwya91sadot108A"

# 管理员邀请码 (用于首次创建管理员账号)
export ADMIN_INVITE_CODE="76e2f0f3a8ee99ce498376118af55293"

# Notion 服务配置 (获取 API Key: https://www.notion.so/my-integrations)
export NOTION_API_KEY=""

# 邮件配置 (开发环境暂时禁用)
export EMAIL_ENABLED="false"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME=""
export SMTP_PASSWORD=""

# CORS 配置
export ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174,http://0.0.0.0:5173"

# 文件上传配置
export BASE_URL="http://localhost:11451"
export UPLOAD_DIR="./uploads"
export MAX_FILE_SIZE="10485760"
export ALLOWED_FILE_TYPES=".md,.txt,.json"

# 限流配置
export RATE_LIMIT_ENABLED="true"
export REQUESTS_PER_MINUTE="100"
export REQUESTS_PER_HOUR="1000"

# 安全配置
export BCRYPT_COST="12"
export SESSION_TIMEOUT="24h"
export REFRESH_TOKEN_TIMEOUT="168h"

# 缓存配置 (使用内存缓存，不需要Redis)
export CACHE_ENABLED="true"
export CACHE_TTL="900s"

# 前端URL
export FRONTEND_URL="http://localhost:5173"

echo "✅ 环境变量设置完成！"
echo ""
echo "📝 重要信息:"
echo "- JWT密钥已设置"
echo "- 管理员邀请码: $ADMIN_INVITE_CODE"
echo "- 使用此邀请码可以注册管理员账号"
echo ""
echo "🚀 现在可以启动后端服务:"
echo "   cd apps/backend && go run main.go"
echo "   (GOFLAGS 已自动开启 sqlite_fts5，以启用全文索引)"
