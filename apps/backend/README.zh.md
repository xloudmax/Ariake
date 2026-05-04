# C404 后端

[English](./README.md) | [简体中文](./README.zh.md)

Ariake生态系统的核心 API 和认证引擎。基于 Go 构建。

## 🌟 项目概览

C404 Backend 是一个高性能的 Go 服务，处理博客平台的各种核心业务。它管理用户认证、博文生命周期、版本历史，并通过统一的 GraphQL API 编排前端与 AI 计算侧车之间的数据流。

## 🛠️ 技术栈

- **语言**: Go 1.24+
- **框架**: Gin (HTTP), gqlgen (GraphQL)
- **数据库**: GORM (开发使用 SQLite, 生产使用 PostgreSQL)
- **认证**: JWT (JSON Web Tokens)
- **API**: GraphQL (主要), REST (传统接口/上传)

## 🚀 任务指南

### 环境配置
1. 安装 Go 1.24+
2. 安装依赖: `go mod download`
3. 参考 `.env.example` 配置 `.env`，填入密钥和数据库路径。

### 运行服务
- **开发模式**: `go run main.go` (运行在 `localhost:11451`)
- **测试**: `go test ./...`
- **代码生成**: 如果修改了 `graph/schema.graphqls`，运行 `go generate ./...` 或 `gqlgen generate` 来更新 GraphQL 解析器。

## 📚 参考资料

### 核心模块
- `graph/`: GraphQL schema 和生成的解析器。
- `models/`: 博文、版本、用户和知识图谱的 GORM 模型。
- `services/`: 业务逻辑，包括与 AI 服务的集成。
- `middleware/`: JWT 认证和日志记录。

### 数据库迁移
应用使用 GORM 的 AutoMigrate 功能。查看 `database/migrations.go` 获取架构定义。

## 💡 概念原理解析

### GraphQL 架构
C404 采用了 **Schema-First** 的 GraphQL 方案。这确保了前端和移动端应用拥有严格的、类型安全的契约。数据模型的任何变更都必须反映在 schema 文件中，然后通过自动代码生成将类型传播到所有客户端。

---
[Ariake Monorepo](../../README.md) 的一部分。
