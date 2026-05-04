# C404 前端

[English](./README.md) | [简体中文](./README.zh.md)

Ariake生态系统的统一 Web 界面和内容管理系统。基于 React 19 构建。

## 🌟 项目概览

C404 Frontend 是一个现代化的、响应式的 Web 应用程序，作为内容管理和阅读的主要界面。它具有强大的 Markdown 编辑器、实时 AI 洞察，以及基于最新 React 和 Tailwind CSS 技术构建的玻璃拟态 UI 设计。

## 🛠️ 技术栈

- **框架**: React 19
- **构建工具**: Vite
- **样式**: Tailwind CSS 4, Ant Design 5
- **数据**: Apollo Client (GraphQL)
- **状态管理**: React Hooks & Context API

## 🚀 任务指南

### 环境配置
1. 安装依赖: `pnpm install`
2. 参考 `.env.example` 配置 `.env`，将 `VITE_API_URL` 指向你的后端。

### 运行应用
- **开发模式**: `pnpm dev` (运行在 `localhost:5173`)
- **打包**: `pnpm build`
- **代码检查**: `pnpm lint`
- **测试**: `pnpm test` (基于 Vitest)

## 📚 参考资料

### 核心组件
- `src/components/MarkdownEditor`: 支持 GFM 和 KaTeX 的自定义编辑器。
- `src/apollo/client.ts`: GraphQL 客户端配置。
- `src/pages/`: 文章、个人资料和设置的路由组件。

### 项目脚本
- `pnpm codegen`: 从 GraphQL schema 生成 TypeScript 类型（需要后端正在运行）。

## 💡 概念原理解析

### React 19 与 Tailwind 4 集成
C404 Frontend 利用 **React 19** 进行渲染优化，并使用全新的 **Tailwind CSS 4** 引擎实现更快的构建和先进的样式能力。设计系统结合了 Ant Design 强大的组件和 Tailwind 的实用优先灵活性，从而实现了高质量的“玻璃表面 (Glass Surface)”美学。

---
[Ariake Monorepo](../../README.md) 的一部分。
