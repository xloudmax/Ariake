# C404 AI 服务

[English](./README.md) | [简体中文](./README.zh.md)

Ariake生态系统的 AI 计算侧车，驱动 GraphRAG、机制树和知识提取。

## 🌟 项目概览

C404 AI Service 是一个基于 FastAPI 构建的高性能 Python 后端。它作为一个智能处理层，将非结构化文本转换为结构化知识图谱，并利用 GraphRAG（图检索增强生成）提供先进的语义搜索能力。

## 🛠️ 技术栈

- **语言**: Python 3.12+
- **框架**: FastAPI
- **AI 模型**: Google Gemini 2.0 / 1.5 (Pro & Flash)
- **图处理**: Leidenalg (社区检测), NetworkX
- **数据库**: PostgreSQL + pgvector (向量嵌入)
- **依赖管理**: uv

## 🚀 任务指南

### 环境配置
1. 安装 `uv`: `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. 安装依赖: `uv sync`
3. 参考 `.env.example` 配置 `.env`，填入 `GOOGLE_API_KEY` 和数据库凭据。

### 运行服务
- **开发模式**: `uv run uvicorn ai_service.main:app --reload`
- **构建社区**: 在导入数据后触发 `/graph/build-communities` 接口。

## 📚 参考资料

### 核心接口
- `POST /generate/mechanism-tree`: 生成功能分解机制树。
- `POST /extract/knowledge`: 从文本中提取实体和关系。
- `POST /graph/global-search`: 在知识图谱上执行 GraphRAG 搜索。
- `GET /health`: 服务健康检查。

### 模型配置
模型通过 `model_config.yaml` 管理。你可以为 `critic_agent` 或 `global_search` 等特定任务自定义模型、温度和最大 token 数。

## 💡 概念原理解析

### GraphRAG 与 社区摘要
与仅检索扁平文本块的标准 RAG 不同，C404 AI Service 使用了 **GraphRAG**。它将提取的知识组织成图，使用 **Leiden 算法** 检测社区，并生成分层摘要。这使得 AI 能够回答关于整个数据集的全局查询，而不仅仅是特定的局部片段。

---
[Ariake Monorepo](../../README.md) 的一部分。
