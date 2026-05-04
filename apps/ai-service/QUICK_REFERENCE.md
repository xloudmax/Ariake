# AI Service 快速参考

## 🚀 快速开始

```bash
# 启动服务
pnpm dev

# 健康检查
curl http://localhost:8000/health
```

## 📍 核心路由

| 端点 | 方法 | 功能 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/generate/mechanism-tree` | POST | 生成机制树 |
| `/extract/knowledge` | POST | 提取知识图谱 |
| `/graph/global-search` | POST | GraphRAG 搜索 |

## 💡 常用示例

### 1. 生成机制树

```bash
curl -X POST http://localhost:8000/generate/mechanism-tree \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"query": "How do geckos climb walls?"}'
```

### 2. 提取知识

```bash
curl -X POST http://localhost:8000/extract/knowledge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"text": "React is a JavaScript library"}'
```

### 3. 全局搜索

```bash
curl -X POST http://localhost:8000/graph/global-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"query": "What is GraphRAG?", "search_mode": "hybrid"}'
```

## 🔧 TypeScript 客户端

```typescript
import AIServiceClient from './client';

const client = new AIServiceClient({
  baseURL: 'http://localhost:8000',
  apiKey: process.env.AI_SERVICE_API_KEY,
});

// 生成机制树
const tree = await client.generateMechanismTree({
  query: 'How do birds fly?'
});

// 流式搜索
for await (const event of client.streamGlobalSearch({
  query: 'What is distributed consensus?'
})) {
  console.log(event);
}
```

## 📊 数据结构

### 机制树节点

```typescript
{
  id: string,
  data: {
    title: string,
    active_ingredient: string,  // ≤15 词
    level: number,
    applications: [{
      domain: "Close" | "Somewhat Far" | "Distant",
      example: string,
      context: string,
      strategy: string
    }]
  }
}
```

### 知识实体

```typescript
{
  name: string,
  type: string,        // "framework", "concept", etc.
  description: string
}
```

### 知识关系

```typescript
{
  source: string,
  target: string,
  relation_type: string,  // "implements", "depends_on", etc.
  description: string
}
```

## 🚨 错误处理

```typescript
try {
  await client.globalSearch({ query: 'test' });
} catch (error) {
  // GraphNotReadyError: 图未构建
  // ModelUnavailableError: AI 模型不可用
  // DatabaseError: 数据库错误
}
```

## 📚 完整文档

- [API Reference](./API_REFERENCE.md) - 完整 API 文档
- [Types](./types.ts) - TypeScript 类型定义
- [Client](./client.ts) - TypeScript 客户端

## 🔐 认证

```http
X-API-Key: your_api_key_here
```

公开端点（无需认证）:
- `/health`
- `/db-health`
- `/docs`
- `/redoc`

## 🌐 交互式文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
