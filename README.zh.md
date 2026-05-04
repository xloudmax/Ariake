# Ariake

<div align="center">
  <img src="./apps/mobile/assets/icon.png" width="120" height="120" style="border-radius: 20%" />
  <h1>Ariake</h1>
  <p><b>AI Reasoning & Intelligent Archive for Knowledge Ecosystems</b></p>
  <p><i>Ariake 是一个面向科学 Markdown 发布、GraphRAG 推理与跨平台内容交付的 AI 原生知识生态系统。</i></p>

  [![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat-square&logo=go&logoColor=white)](./apps/backend)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](./apps/frontend)
  [![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo)](./apps/mobile)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](./apps/ai-service)
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](./apps/desktop)
</div>

---

[English](./README.md) | [简体中文](./README.zh.md)

## 🌟 项目概览

Ariake 是一个**面向科学的知识生态系统**，集成了深度 AI 分析与跨平台分发。它解决了移动端渲染复杂科学内容（KaTeX/Markdown）的痛点，并提供了一个基于 AI 驱动的 **GraphRAG** 引擎，用于跨领域推理。

## 🏗️ 系统架构

```mermaid
graph TD
    User((用户))
    
    subgraph 客户端层
        Web[React 19 Web CMS]
        Mobile[Expo iOS/Android App]
        Desktop[Tauri 桌面外壳]
    end
    
    subgraph 核心服务层
        Backend[Go 1.24 API 网关]
        DB[(PostgreSQL / pgvector)]
    end
    
    subgraph 智能逻辑层
        AIService[FastAPI AI 侧车]
        LLM[[Gemini 2.0 / 1.5]]
        GraphRAG[GraphRAG 引擎]
    end

    User --> 客户端层
    客户端层 -->|GraphQL| Backend
    Backend --> DB
    Backend <-->|FastAPI| AIService
    AIService -->|Leiden 社区检测| GraphRAG
    GraphRAG --> LLM
```

## 📊 项目统计

| 组件 | 语言 | 代码行数 | 角色 |
| :--- | :---: | :---: | :--- |
| **移动端 / 前端** | TypeScript | ~51,500 | UI 与 原生渲染 |
| **后端服务** | Go | ~42,600 | 核心逻辑与认证 |
| **AI 服务** | Python | ~31,400 | GraphRAG 与 推理 |
| **桌面端** | Rust | ~230 | 原生桌面桥接 |
| **总计** | **4 种编程语言** | **~130,000** | **全栈闭环生态** |

## ✨ 功能矩阵

| 功能特性 | 移动端 | Web 端 | 桌面端 | AI 服务 |
| :--- | :---: | :---: | :---: | :---: |
| 高保真 Markdown 渲染 | ✅ | ✅ | ✅ | - |
| KaTeX 科学公式 | ✅ | ✅ | ✅ | - |
| GraphRAG 全局搜索 | ✅ | ✅ | ✅ | ✅ |
| 离线草稿存储 | ✅ | 🚧 | ✅ | - |
| 机制树生成 (DRR) | - | ✅ | ✅ | ✅ |

## 🚀 快速开始

### 前置条件
- **Node.js**: v22+ & **pnpm**: v10+
- **Go**: v1.24+
- **Python**: v3.12+ (建议使用 uv)
- **Rust**: v1.75+ (仅桌面端构建需要)

### 开发流程
1. **安装依赖**: `pnpm install`
2. **环境配置**: 将子目录下的 `.env.example` 复制为 `.env`。
3. **启动服务**: `pnpm dev`

---
为下一代知识分享而生。
