# 配置管理系统

本项目实现了完整的配置管理系统，支持多环境配置、环境变量覆盖和单例模式。

## 配置结构

### 基础配置
- `GIN_MODE`: 运行环境 (development/production/test)
- `PORT`: 服务器端口 (默认: 11451)
- `LOG_LEVEL`: 日志级别 (默认: info)

### 数据库配置
- `DATABASE_URL`: 数据库连接字符串 (默认: blog_platform.db)

### JWT配置
- `JWT_SECRET`: JWT签名密钥 (默认: JNU_technicians_club)
- `BCRYPT_COST`: 密码加密成本 (默认: 12)
- `SESSION_TIMEOUT`: 会话超时时间 (默认: 24h)
- `REFRESH_TOKEN_TIMEOUT`: 刷新Token超时时间 (默认: 168h)

### 邮件配置
- `EMAIL_ENABLED`: 是否启用邮件 (默认: false)
- `SMTP_HOST`: SMTP服务器地址
- `SMTP_PORT`: SMTP端口 (默认: 587)
- `SMTP_USERNAME`: SMTP用户名
- `SMTP_PASSWORD`: SMTP密码

### CORS配置
- `ALLOWED_ORIGINS`: 允许的跨域来源 (默认: http://localhost:5173)

### 文件上传配置
- `BASE_PATH`: 文件上传基础路径 (默认: uploads)
- `MAX_FILE_SIZE`: 最大文件大小 (默认: 10485760 bytes = 10MB)
- `ALLOWED_FILE_TYPES`: 允许的文件类型 (默认: .md,.txt,.json)

### 限流配置
- `RATE_LIMIT_ENABLED`: 是否启用限流 (默认: true)
- `REQUESTS_PER_MINUTE`: 每分钟请求数 (默认: 100)
- `REQUESTS_PER_HOUR`: 每小时请求数 (默认: 1000)

### 缓存配置
- `CACHE_ENABLED`: 是否启用缓存 (默认: true)
- `CACHE_TTL`: 缓存生存时间 (默认: 900s)

## 使用方法

### 1. 环境变量配置

复制配置模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```bash
# 修改端口
PORT=8080

# 修改JWT密钥（生产环境强烈建议修改）
JWT_SECRET=your-super-secret-key

# 启用邮件服务
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 2. 代码中使用配置

```go
import "repair-platform/config"

// 获取全局配置实例（单例模式）
cfg := config.GetConfig()

// 使用基础配置
port := cfg.Port
environment := cfg.Environment

// 环境判断
if cfg.IsProduction() {
    // 生产环境逻辑
}

if cfg.IsDevelopment() {
    // 开发环境逻辑
}

// 获取特定配置
dbConfig := cfg.GetDatabaseConfig()
corsConfig := cfg.GetCORSConfig()
logConfig := cfg.GetLogConfig()
rateLimitConfig := cfg.GetRateLimitConfig()
```

### 3. 多环境配置

#### 开发环境
```bash
GIN_MODE=development
PORT=11451
LOG_LEVEL=debug
```

#### 生产环境
```bash
GIN_MODE=production
PORT=80
LOG_LEVEL=error
JWT_SECRET=production-secret-key
EMAIL_ENABLED=true
```

#### 测试环境
```bash
GIN_MODE=test
EMAIL_ENABLED=false
RATE_LIMIT_ENABLED=false
```

### 4. 配置验证

运行配置验证程序：
```bash
go run cmd/config-demo/main.go
```

## 环境特定行为

### 开发环境 (development/debug)
- 日志格式为控制台格式
- 日志级别为debug
- 跳过邮箱验证
- CORS允许所有来源
- 宽松的限流策略

### 生产环境 (production/release)
- 日志格式为JSON
- 禁用GraphQL Playground
- 严格的限流策略
- 强制邮箱验证（如果启用）

### 测试环境 (test)
- 使用内存数据库
- 禁用限流
- 减少日志输出
- 跳过邮箱验证

## 扩展配置

要添加新的配置项：

1. 在 `Config` 结构体中添加字段：
```go
type Config struct {
    // ... 现有字段
    NewFeatureEnabled bool
    NewFeatureTimeout string
}
```

2. 在 `LoadConfig()` 中添加加载逻辑：
```go
NewFeatureEnabled: getEnvAsBool("NEW_FEATURE_ENABLED", false),
NewFeatureTimeout: getEnv("NEW_FEATURE_TIMEOUT", "30s"),
```

3. 在 `.env.example` 中添加文档：
```bash
# 新功能配置
NEW_FEATURE_ENABLED=false
NEW_FEATURE_TIMEOUT=30s
```

## 注意事项

1. **生产环境安全**：生产环境必须修改默认的JWT密钥
2. **环境变量优先级**：环境变量会覆盖默认配置
3. **单例模式**：配置实例是单例，首次加载后不会重新读取环境变量
4. **类型安全**：所有配置项都有类型检查和默认值
5. **向后兼容**：新增配置项不会影响现有功能

## 配置项参考

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| GIN_MODE | string | development | 运行模式 |
| PORT | string | 11451 | 服务端口 |
| JWT_SECRET | string | JNU_technicians_club | JWT密钥 |
| DATABASE_URL | string | blog_platform.db | 数据库文件 |
| EMAIL_ENABLED | bool | false | 是否启用邮件 |
| RATE_LIMIT_ENABLED | bool | true | 是否启用限流 |
| ... | ... | ... | ... |

更多配置项请参考 `config/config.go` 文件中的结构定义。
