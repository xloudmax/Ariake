# C404 桌面端

[English](./README.md) | [简体中文](./README.zh.md)

Ariake生态系统的原生桌面外壳。基于 Tauri 2 构建。

## 🌟 项目概览

C404 Desktop 通过轻量级的原生外壳将博客体验带到桌面。它使用 Tauri 包装了 C404 Web 前端，提供系统级集成、比传统浏览器更好的性能以及访问原生桌面功能的能力。

## 🛠️ 技术栈

- **框架**: Tauri 2 (Rust)
- **前端**: React 19 (从 `apps/frontend` 打包)
- **语言**: Rust (系统桥接), TypeScript (UI 界面)
- **构建工具**: Cargo, pnpm

## 🚀 任务指南

### 环境配置
1. 安装 Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. 安装 Tauri CLI: `pnpm add -D @tauri-apps/cli`
3. 确保 `apps/frontend` 已打包或正在运行。

### 运行桌面应用
- **开发模式**: `pnpm tauri dev`
- **打包**: `pnpm tauri build`

## 📚 参考资料

### 核心配置
- `tauri.conf.json`: 窗口设置、安全权限（允许列表）和打包信息的主要配置文件。
- `src-tauri/src/main.rs`: Rust 后端入口点和自定义命令定义。

### 集成方式
桌面应用在开发期间连接到运行在 `localhost:5173` 的前端，并在最终发布时嵌入来自 `../frontend/dist` 的生产构建。

## 💡 概念原理解析

### Tauri 2 架构
与捆绑完整 Chromium 实例的 Electron 不同，**Tauri 2** 使用系统的原生 WebView（macOS 上的 WebKit，Windows 上的 WebView2）。这导致安装包体积显著缩小（通常小于 10MB），且内存占用更低，同时仍允许使用现代 Web 技术构建 UI。

---
[Ariake Monorepo](../../README.md) 的一部分。
