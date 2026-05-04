# Ariake Mobile App

[English](./README.md) | [简体中文](./README.zh.md)

A high-performance, AI-enhanced mobile client for the Ariake ecosystem. Built with React Native and Expo.

## 🌟 Overview / 项目概览

The C404 Mobile App provides a seamless reading and writing experience on the go. It features a custom native Markdown renderer optimized for scientific content (KaTeX) and offline-first capabilities for drafting posts and viewing insights.

C404 移动端应用提供了随时随地的无缝读写体验。它具有专门针对科学内容（KaTeX）优化的自定义原生 Markdown 渲染器，以及用于撰写文章和查看洞察的离线优先能力。

## 🛠️ Tech Stack / 技术栈

- **Framework**: Expo / React Native
- **Navigation**: Expo Router (File-based)
- **Styling**: NativeWind (Tailwind CSS 4)
- **Data**: Apollo Client (GraphQL)
- **Rendering**: Custom Markdown-it + KaTeX native bridge

## 🚀 How-to Guides / 任务指南

### Development / 开发环境
1. Install dependencies: `pnpm install`
2. Start the dev server: `pnpm dev`
3. Open on device: Use the Expo Go app or a development build.

### Building for Production / 生产打包
- **iOS**: `npx expo run:ios --configuration Release`
- **Android**: `npx expo run:android --variant release`
- **EAS Build**: `eas build --platform ios` (Requires Expo account)

## 📚 Reference / 参考资料

### Key Directories / 目录结构
- `/app`: File-based routes (Tabs, Editor, Post views)
- `/src/components/richContent`: Native Markdown rendering logic
- `/src/graphql`: GraphQL queries and mutations
- `/src/insights`: AI-powered content analysis storage

### Environment Variables / 环境变量
Create a `.env` file based on `.env.example`:
- `EXPO_PUBLIC_API_URL`: Backend GraphQL endpoint

## 💡 Explanations / 概念原理解析

### Native Markdown Rendering
Unlike many apps that use WebViews for Markdown, Ariake uses a **Native Bridge** approach. It parses Markdown into an Abstract Syntax Tree (AST) and maps nodes directly to React Native `<Text>` and `<View>` components for 60FPS performance and system-native typography.

与许多使用 WebView 渲染 Markdown 的应用不同，Ariake 采用了 **原生桥接 (Native Bridge)** 方案。它将 Markdown 解析为抽象语法树 (AST)，并将节点直接映射到 React Native 的 `<Text>` 和 `<View>` 组件，从而实现 60FPS 的性能和系统原生排版。

---
Part of the [Ariake Monorepo](../../README.md).
