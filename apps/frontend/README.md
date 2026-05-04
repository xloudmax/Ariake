# C404 Frontend

[English](./README.md) | [简体中文](./README.zh.md)

The unified Web UI and CMS for the Ariake ecosystem. Built with React 19.

## 🌟 Overview / 项目概览

C404 Frontend is a modern, responsive web application that serves as the primary interface for content management and consumption. It features a powerful Markdown editor, real-time AI insights, and a glassmorphic UI design built on the latest React and Tailwind CSS technologies.

C404 Frontend 是一个现代化的、响应式的 Web 应用程序，作为内容管理和阅读的主要界面。它具有强大的 Markdown 编辑器、实时 AI 洞察，以及基于最新 React 和 Tailwind CSS 技术构建的玻璃拟态 UI 设计。

## 🛠️ Tech Stack / 技术栈

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4, Ant Design 5
- **Data**: Apollo Client (GraphQL)
- **State Management**: React Hooks & Context API

## 🚀 How-to Guides / 任务指南

### Setup / 环境配置
1. Install dependencies: `pnpm install`
2. Configure `.env` with `VITE_API_URL` pointing to your backend.

### Running the App / 运行应用
- **Development**: `pnpm dev` (Runs on `localhost:5173`)
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **Testing**: `pnpm test` (Powered by Vitest)

## 📚 Reference / 参考资料

### Key Components / 核心组件
- `src/components/MarkdownEditor`: Custom editor with GFM and KaTeX support.
- `src/apollo/client.ts`: GraphQL client configuration.
- `src/pages/`: Route-level components for Articles, Profile, and Settings.

### Project Scripts / 项目脚本
- `pnpm codegen`: Generates TypeScript types from the GraphQL schema (requires backend running).

## 💡 Explanations / 概念原理解析

### React 19 & Tailwind 4 Integration
C404 Frontend leverages **React 19** for optimized rendering and the new **Tailwind CSS 4** engine for faster builds and advanced styling capabilities. The design system uses a combination of Ant Design's robust components and Tailwind's utility-first flexibility to achieve a high-quality "Glass Surface" aesthetic.

C404 Frontend 利用 **React 19** 进行渲染优化，并使用全新的 **Tailwind CSS 4** 引擎实现更快的构建和先进的样式能力。设计系统结合了 Ant Design 强大的组件和 Tailwind 的实用优先灵活性，从而实现了高质量的“玻璃表面 (Glass Surface)”美学。

---
Part of the [Ariake Monorepo](../../README.md).
