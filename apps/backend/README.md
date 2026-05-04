# C404 Backend

[English](./README.md) | [简体中文](./README.zh.md)

The core API and authentication engine for the Ariake ecosystem. Built with Go.

## 🌟 Overview / 项目概览

C404 Backend is a high-performance Go service that handles the heavy lifting of the blog platform. It manages user authentication, blog post lifecycle, version history, and orchestrates data flow between the frontend and the AI compute sidecar via a unified GraphQL API.

C404 Backend 是一个高性能的 Go 服务，处理博客平台的各种核心业务。它管理用户认证、博文生命周期、版本历史，并通过统一的 GraphQL API 编排前端与 AI 计算侧车之间的数据流。

## 🛠️ Tech Stack / 技术栈

- **Language**: Go 1.24+
- **Framework**: Gin (HTTP), gqlgen (GraphQL)
- **Database**: GORM (SQLite for dev, PostgreSQL for prod)
- **Auth**: JWT (JSON Web Tokens)
- **API**: GraphQL (Primary), REST (Legacy/Uploads)

## 🚀 How-to Guides / 任务指南

### Setup / 环境配置
1. Install Go 1.24+
2. Install dependencies: `go mod download`
3. Configure `.env` with your secret keys and database path.

### Running the Server / 运行服务
- **Development**: `go run main.go` (Runs on `localhost:11451`)
- **Testing**: `go test ./...`
- **Codegen**: If you modify `graph/schema.graphqls`, run `go generate ./...` or `gqlgen generate` to update the GraphQL resolvers.

## 📚 Reference / 参考资料

### Key Modules / 核心模块
- `graph/`: GraphQL schema and generated resolvers.
- `models/`: GORM models for Posts, Versions, Users, and Knowledge Graph.
- `services/`: Business logic, including integration with the AI Service.
- `middleware/`: JWT authentication and logging.

### Database Migrations / 数据库迁移
The app uses GORM's AutoMigrate feature. Check `database/migrations.go` for the schema definition.

## 💡 Explanations / 概念原理解析

### GraphQL Architecture
C404 uses a **Schema-First** GraphQL approach. This ensures that the frontend and mobile apps have a strict, type-safe contract to work with. Any change in the data model must be reflected in the schema file, which then propagates types to all clients through automated code generation.

C404 采用了 **Schema-First** 的 GraphQL 方案。这确保了前端和移动端应用拥有严格的、类型安全的契约。数据模型的任何变更都必须反映在 schema 文件中，然后通过自动代码生成将类型传播到所有客户端。

---
Part of the [Ariake Monorepo](../../README.md).
