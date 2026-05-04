# Ariake

<div align="center">
  <img src="./apps/mobile/assets/icon.png" width="120" height="120" style="border-radius: 20%" />
  <h1>Ariake</h1>
  <p><b>AI Reasoning & Intelligent Archive for Knowledge Ecosystems</b></p>
  <p><i>Ariake is an AI-native scientific knowledge ecosystem for Markdown publishing, GraphRAG reasoning, and cross-platform content delivery.</i></p>

  [![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat-square&logo=go&logoColor=white)](./apps/backend)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](./apps/frontend)
  [![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo)](./apps/mobile)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](./apps/ai-service)
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](./apps/desktop)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

---

[English](./README.md) | [简体中文](./README.zh.md)

## 🌟 Overview

Ariake is a **scientifically-oriented knowledge ecosystem** that integrates deep AI analysis with cross-platform delivery. It solves the pain points of rendering complex scientific content (KaTeX/Markdown) on mobile and provides an AI-powered **GraphRAG** engine for cross-domain reasoning.

## 🏗️ System Architecture

```mermaid
graph TD
    User((User))
    
    subgraph Clients
        Web[React 19 Web CMS]
        Mobile[Expo iOS/Android App]
        Desktop[Tauri Desktop Shell]
    end
    
    subgraph Core
        Backend[Go 1.24 API Gateway]
        DB[(PostgreSQL / pgvector)]
    end
    
    subgraph Intelligence
        AIService[FastAPI AI Sidecar]
        LLM[[Gemini 2.0 / 1.5]]
        GraphRAG[GraphRAG Engine]
    end

    User --> Clients
    Clients -->|GraphQL| Backend
    Backend --> DB
    Backend <-->|FastAPI| AIService
    AIService -->|Leiden Community| GraphRAG
    GraphRAG --> LLM
```

## 📊 Project Statistics

| Component | Language | Lines of Code | Role |
| :--- | :---: | :---: | :--- |
| **Mobile / Frontend** | TypeScript | ~51,500 | UI & Native Rendering |
| **Backend** | Go | ~42,600 | Logic & Auth |
| **AI Service** | Python | ~31,400 | GraphRAG & Reasoning |
| **Desktop** | Rust | ~230 | Native Desktop Bridge |
| **Total** | **4 Languages** | **~130,000** | **Full-Stack Ecosystem** |

## ✨ Feature Matrix

| Feature | Mobile | Web | Desktop | AI |
| :--- | :---: | :---: | :---: | :---: |
| High-Fidelity Markdown | ✅ | ✅ | ✅ | - |
| KaTeX Scientific Math | ✅ | ✅ | ✅ | - |
| GraphRAG Search | ✅ | ✅ | ✅ | ✅ |
| Offline Draft Storage | ✅ | 🚧 | ✅ | - |
| Mechanism Trees (DRR) | - | ✅ | ✅ | ✅ |

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v22+ & **pnpm**: v10+
- **Go**: v1.24+
- **Python**: v3.12+ (uv recommended)
- **Rust**: v1.75+ (for Desktop builds)

### Development
1. **Install dependencies**: `pnpm install`
2. **Setup environment**: Copy `.env.example` to `.env` in sub-apps.
3. **Run all services**: `pnpm dev`

---
Built with ❤️ for the next generation of knowledge sharing.
