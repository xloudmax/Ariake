# C404 Desktop

[English](./README.md) | [简体中文](./README.zh.md)

The native desktop shell for the Ariake ecosystem. Powered by Tauri 2.

## 🌟 Overview / 项目概览

C404 Desktop brings the blogging experience to the desktop with a lightweight, native shell. It wraps the C404 Web frontend using Tauri, providing system-level integration, better performance than traditional browsers, and access to native desktop features.

C404 Desktop 通过轻量级的原生外壳将博客体验带到桌面。它使用 Tauri 包装了 C404 Web 前端，提供系统级集成、比传统浏览器更好的性能以及访问原生桌面功能的能力。

## 🛠️ Tech Stack / 技术栈

- **Framework**: Tauri 2 (Rust)
- **Frontend**: React 19 (Bundled from `apps/frontend`)
- **Language**: Rust (System bridge), TypeScript (UI)
- **Build Tool**: Cargo, pnpm

## 🚀 How-to Guides / 任务指南

### Setup / 环境配置
1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install Tauri CLI: `pnpm add -D @tauri-apps/cli`
3. Ensure `apps/frontend` is built or running.

### Running the Desktop App / 运行应用
- **Development**: `pnpm tauri dev`
- **Build**: `pnpm tauri build`

## 📚 Reference / 参考资料

### Key Configuration / 核心配置
- `tauri.conf.json`: Main configuration file for window settings, security permissions (allowlist), and bundle information.
- `src-tauri/src/main.rs`: Entry point for the Rust backend and custom command definitions.

### Integration / 集成方式
The desktop app connects to the frontend running on `localhost:5173` during development and embeds the production build from `../frontend/dist` for final releases.

## 💡 Explanations / 概念原理解析

### Tauri 2 Architecture
Unlike Electron, which bundles a full Chromium instance, **Tauri 2** uses the system's native WebView (WebKit on macOS, WebView2 on Windows). This results in significantly smaller bundle sizes (often < 10MB) and lower memory usage, while still allowing the use of modern web technologies for the UI.

与捆绑完整 Chromium 实例的 Electron 不同，**Tauri 2** 使用系统的原生 WebView（macOS 上的 WebKit，Windows 上的 WebView2）。这导致安装包体积显著缩小（通常小于 10MB），且内存占用更低，同时仍允许使用现代 Web 技术构建 UI。

---
Part of the [Ariake Monorepo](../../README.md).
