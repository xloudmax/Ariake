# AI Service 路由和数据契约总结

## 📋 路由清单

### 健康检查 (2)
- `GET /health` - 服务健康检查
- `GET /db-health` - 数据库健康检查

### 机制树生成 (2)
- `POST /generate/mechanism-tree` - 生成 DRR 机制树
- `POST /generate/mechanism-tree/stream` - 流式生成机制树

### 知识图谱 (3)
- `POST /extract/knowledge` - 提取实体和关系
- `POST /embedding` - 生成向量嵌入
- `POST /graph/build-communities` - 构建图社区

### GraphRAG 搜索 (2)
- `POST /graph/global-search` - 全局搜索
- `POST /graph/global-search/stream` - 流式全局搜索

**总计**: 9 个端点

---

## 📊 核心数据结构

### 1. 机制树 (Mechanism Tree)

```typescript
// 请求
{ query: string }

// 响应
{
  tree_metadata: {
    query: string,
    root_mechanism: string
  },
  nodes: Array<{
    id: string,
    type: "customMechanismNode",
    data: {
      title: string,
      active_ingredient: string,  // ≤15 词
      level: number,
      applications: Array<{
        domain: "Close" | "Somewhat Far" | "Distant",
        example: string,
        context: string,
        strategy: string
      }>
    },
    position: { x: number, y: number }
  }>,
  edges: Array<{
    id: string,
    source: string,
    target: string
  }>
}
```

### 2. 知识提取 (Knowledge Extraction)

```typescript
// 请求
{
  text: string,
  manual_data?: {
    entities: Entity[],
    relationships: Relationship[]
  }
}

// 实体
{
  name: string,
  type: string,        // "framework", "concept", "language"
  description: string
}

// 关系
{
  source: string,
  target: string,
  relation_type: string,  // "implements", "depends_on", "uses"
  description: string
}

// 响应
{
  entities: Entity[],
  relationships: Relationship[]
}
```

### 3. 向量嵌入 (Embedding)

```typescript
// 请求
{ text: string }

// 响应
{ embedding: number[] }  // 768 或 1024 维
```

### 4. 全局搜索 (Global Search)

```typescript
// 请求
{
  query: string,
  search_mode?: "hybrid" | "vector",  // 默认 "hybrid"
  active_ingredients?: string,
  bypass_critic?: boolean             // 默认 false
}

// 响应
{
  answer: string,
  sources?: Array<{
    community_id: number,
    summary: string,
    relevance: number
  }>,
  metadata?: {
    search_mode: string,
    communities_searched: number,
    generation_time_ms: number
  }
}
```

---

## 🔄 流式响应格式

所有流式端点使用 Server-Sent Events (SSE):

```typescript
// 事件类型
type StreamEventType = "node" | "edge" | "chunk" | "done" | "error"

// 事件格式
{
  type: StreamEventType,
  data?: any,        // 节点/边数据
  content?: string,  // 文本块
  answer?: any,      // 完整答案
  error?: string     // 错误消息
}
```

---

## 🚨 错误响应

统一错误格式:

```typescript
{
  error: string,
  type: "ModelUnavailableError" 
      | "GraphNotReadyError" 
      | "DatabaseError" 
      | "ExtractionError" 
      | "SearchError"
}
```

---

## 🔐 认证

需要认证的端点 (7/9):
- 所有 `/generate/*` 端点
- 所有 `/extract/*` 端点
- 所有 `/embedding` 端点
- 所有 `/graph/*` 端点

认证方式:
```http
X-API-Key: your_api_key_here
```

公开端点 (2/9):
- `/health`
- `/db-health`

---

## 📁 新增文件

```
apps/ai-service/
├── API_REFERENCE.md       # 完整 API 文档（9 个端点详解）
├── QUICK_REFERENCE.md     # 快速参考卡片
├── types.ts               # TypeScript 类型定义（15+ 接口）
├── client.ts              # TypeScript 客户端（含使用示例）
└── README.md              # 更新：添加文档链接
```

---

## 💡 使用场景

### 场景 1: 生成机制树
```typescript
const tree = await client.generateMechanismTree({
  query: 'How do geckos climb walls?'
});
// 用于可视化功能分解
```

### 场景 2: 构建知识图谱
```typescript
// 1. 提取知识
await client.extractKnowledge({
  text: 'React uses Virtual DOM...'
});

// 2. 构建社区
await client.buildCommunities();

// 3. 搜索
const result = await client.globalSearch({
  query: 'What is Virtual DOM?'
});
```

### 场景 3: 流式交互
```typescript
for await (const event of client.streamGlobalSearch({
  query: 'Explain distributed consensus'
})) {
  if (event.type === 'chunk') {
    updateUI(event.content);  // 实时更新 UI
  }
}
```

---

## 🎯 关键特性

1. **类型安全**: 完整的 TypeScript 类型定义
2. **流式支持**: SSE 实时响应
3. **错误处理**: 统一的错误格式和类型
4. **客户端**: 开箱即用的 TypeScript 客户端
5. **文档完整**: API 参考 + 快速参考 + 示例代码

---

## 📊 数据流

```
用户输入
  ↓
[机制树生成] → ReactFlow 可视化
  ↓
[知识提取] → 实体 + 关系
  ↓
[向量嵌入] → 768/1024 维向量
  ↓
[社区检测] → Leiden 聚类
  ↓
[社区摘要] → LLM 生成摘要
  ↓
[全局搜索] → GraphRAG 答案
```

---

## 🔧 配置

通过 `model_config.yaml` 配置:

```yaml
drafting:
  model: "gemini-2.0-flash-exp"  # 快速生成
  
critique:
  model: "gemini-exp-1206"       # 高质量推理
  
embedding:
  model: "text-embedding-004"    # 向量嵌入
  dimension: 768
```

---

## 📚 相关文档

- [API_REFERENCE.md](./API_REFERENCE.md) - 每个端点的详细说明
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - 常用命令和示例
- [types.ts](./types.ts) - 前端类型定义
- [client.ts](./client.ts) - TypeScript 客户端实现

---

## ✨ 总结

AI Service 提供了 **9 个 RESTful 端点**，涵盖:
- ✅ 机制树生成（DRR）
- ✅ 知识图谱构建
- ✅ GraphRAG 搜索
- ✅ 流式响应支持
- ✅ 完整的类型定义
- ✅ 开箱即用的客户端

**所有数据契约都已文档化，可以直接用于前端集成！** 🚀
