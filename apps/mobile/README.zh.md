# C404 移动端应用

[English](./README.md) | [简体中文](./README.zh.md)

Ariake生态系统的高性能、AI 增强型移动客户端。基于 React Native 和 Expo 构建。

## 🌟 项目概览

C404 移动端应用提供了随时随地的无缝读写体验。它具有专门针对科学内容（KaTeX）优化的自定义原生 Markdown 渲染器，以及用于撰写文章和查看洞察的离线优先能力。

## 🛠️ 技术栈

- **框架**: Expo / React Native
- **路由**: Expo Router (基于文件系统)
- **样式**: NativeWind (Tailwind CSS 4)
- **数据**: Apollo Client (GraphQL)
- **渲染**: 自定义 Markdown-it + KaTeX 原生桥接

## 🚀 任务指南

### 开发环境
1. 安装依赖: `pnpm install`
2. 启动开发服务器: `pnpm dev`
3. 在设备上打开: 使用 Expo Go 应用或开发构建版本。

### 生产打包
- **iOS**: `npx expo run:ios --configuration Release`
- **Android**: `npx expo run:android --variant release`
- **EAS 构建**: `eas build --platform ios` (需要 Expo 账号)

## 📚 参考资料

### 目录结构
- `/app`: 基于文件的路由（标签页、编辑器、帖子视图）
- `/src/components/richContent`: 原生 Markdown 渲染逻辑
- `/src/graphql`: GraphQL 查询和变更
- `/src/insights`: AI 驱动的内容分析存储

### 环境变量
参考 `.env.example` 创建 `.env` 文件：
- `EXPO_PUBLIC_API_URL`: 后端 GraphQL 端点

## 💡 概念原理解析

### 原生 Markdown 渲染
与许多使用 WebView 渲染 Markdown 的应用不同，Ariake 采用了 **原生桥接 (Native Bridge)** 方案。它将 Markdown 解析为抽象语法树 (AST)，并将节点直接映射到 React Native 的 `<Text>` 和 `<View>` 组件，从而实现 60FPS 的性能和系统原生排版。

---
[Ariake Monorepo](../../README.md) 的一部分。
