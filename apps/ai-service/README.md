# C404 AI Service

[English](./README.md) | [简体中文](./README.zh.md)

The AI compute sidecar for the Ariake ecosystem, powering GraphRAG, mechanism trees, and knowledge extraction.

## 🌟 Overview / 项目概览

C404 AI Service is a high-performance Python backend built with FastAPI. It acts as an intelligent processing layer that transforms unstructured text into structured knowledge graphs and provides advanced semantic search capabilities using GraphRAG (Graph Retrieval-Augmented Generation).

C404 AI Service 是一个基于 FastAPI 构建的高性能 Python 后端。它作为一个智能处理层，将非结构化文本转换为结构化知识图谱，并利用 GraphRAG（图检索增强生成）提供先进的语义搜索能力。

## 🛠️ Tech Stack / 技术栈

- **Language**: Python 3.12+
- **Framework**: FastAPI
- **AI Models**: Google Gemini 2.0 / 1.5 (Pro & Flash)
- **Graph Processing**: Leidenalg (Community detection), NetworkX
- **Database**: PostgreSQL with pgvector (Vector embeddings)
- **Dependency Management**: uv

## 🚀 How-to Guides / 任务指南

### Setup / 环境配置
1. Install `uv`: `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. Install dependencies: `uv sync`
3. Configure `.env` with your `GOOGLE_API_KEY` and database credentials.

### Running the Service / 运行服务
- **Development**: `uv run uvicorn ai_service.main:app --reload`
- **Build Communities**: Trigger the `/graph/build-communities` endpoint after ingesting data.

## 📚 Reference / 参考资料

### Key API Endpoints / 核心接口
- `POST /generate/mechanism-tree`: Generates functional decomposition trees.
- `POST /extract/knowledge`: Extracts entities and relations from text.
- `POST /graph/global-search`: Executes GraphRAG search over the knowledge graph.
- `GET /health`: Service health check.

### Model Configuration / 模型配置
Models are managed via `model_config.yaml`. You can customize models, temperatures, and max tokens for specific tasks like `critic_agent` or `global_search`.

## 💡 Explanations / 概念原理解析

### GraphRAG & Community Summaries
Unlike standard RAG which only retrieves flat text chunks, C404 AI Service uses **GraphRAG**. It organizes extracted knowledge into a graph, detects communities using the **Leiden algorithm**, and generates hierarchical summaries. This allows the AI to answer global queries about the entire dataset, not just specific local snippets.

与仅检索扁平文本块的标准 RAG 不同，C404 AI Service 使用了 **GraphRAG**。它将提取的知识组织成图，使用 **Leiden 算法** 检测社区，并生成分层摘要。这使得 AI 能够回答关于整个数据集的全局查询，而不仅仅是特定的局部片段。

---
Part of the [Ariake Monorepo](../../README.md).
