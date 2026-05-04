# AI Service API 路由和数据契约

## 📍 路由总览

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查 | ❌ |
| GET | `/db-health` | 数据库健康检查 | ❌ |
| POST | `/generate/mechanism-tree` | 生成机制树 | ✅ |
| POST | `/generate/mechanism-tree/stream` | 流式生成机制树 | ✅ |
| POST | `/extract/knowledge` | 提取知识图谱 | ✅ |
| POST | `/embedding` | 生成向量嵌入 | ✅ |
| POST | `/graph/build-communities` | 构建图社区 | ✅ |
| POST | `/graph/global-search` | 全局搜索 | ✅ |
| POST | `/graph/global-search/stream` | 流式全局搜索 | ✅ |

---

## 🔐 认证

需要认证的端点需要在请求头中提供 API Key：

```http
X-API-Key: your_api_key_here
```

---

## 📋 详细路由

### 1. 健康检查

#### `GET /health`

**描述**: 检查服务是否运行

**请求**: 无

**响应**:
```json
{
  "status": "healthy",
  "service": "C404 Insight AI"
}
```

**状态码**: `200 OK`

---

### 2. 数据库健康检查

#### `GET /db-health`

**描述**: 检查 PostgreSQL 连接和 pgvector 扩展

**请求**: 无

**响应** (成功):
```json
{
  "status": "connected",
  "pgvector_available": true
}
```

**响应** (失败):
```json
{
  "status": "disconnected",
  "reason": "Pool not initialized"
}
```

**状态码**: 
- `200 OK` - 连接正常
- `503 Service Unavailable` - 连接失败

---

### 3. 生成机制树

#### `POST /generate/mechanism-tree`

**描述**: 生成功能分解机制树（DRR）

**请求体**:
```typescript
{
  query: string  // 要分析的主题或问题
}
```

**示例请求**:
```json
{
  "query": "How do geckos climb walls?"
}
```

**响应**:
```typescript
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
      active_ingredient: string,  // 核心机制（≤15词）
      level: number,
      applications: Array<{
        domain: string,      // "Close" | "Somewhat Far" | "Distant"
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

**示例响应**:
```json
{
  "tree_metadata": {
    "query": "How do geckos climb walls?",
    "root_mechanism": "Van der Waals adhesion"
  },
  "nodes": [
    {
      "id": "node-1",
      "type": "customMechanismNode",
      "data": {
        "title": "Gecko Adhesion",
        "active_ingredient": "Millions of nano-scale setae create van der Waals forces",
        "level": 0,
        "applications": [
          {
            "domain": "Close",
            "example": "Gecko-inspired climbing robots",
            "context": "Robotics",
            "strategy": "Replicate hierarchical structure with synthetic materials"
          }
        ]
      },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": []
}
```

**状态码**:
- `200 OK` - 成功
- `503 Service Unavailable` - AI 模型不可用
- `500 Internal Server Error` - 生成失败

---

### 4. 流式生成机制树

#### `POST /generate/mechanism-tree/stream`

**描述**: 使用 Server-Sent Events (SSE) 流式生成机制树

**请求体**: 同 `/generate/mechanism-tree`

**响应**: `text/event-stream`

**事件格式**:
```
data: {"type": "node", "data": {...}}

data: {"type": "edge", "data": {...}}

data: {"type": "done", "answer": {...}}

data: {"type": "error", "error": "..."}
```

**示例**:
```javascript
const eventSource = new EventSource('/generate/mechanism-tree/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'node') {
    console.log('New node:', data.data);
  } else if (data.type === 'done') {
    console.log('Complete:', data.answer);
    eventSource.close();
  }
};
```

---

### 5. 提取知识图谱

#### `POST /extract/knowledge`

**描述**: 从非结构化文本中提取实体和关系

**请求体**:
```typescript
{
  text: string,                    // 要分析的文本
  manual_data?: {                  // 可选：手动提供数据
    entities: Array<Entity>,
    relationships: Array<Relationship>
  }
}
```

**实体结构**:
```typescript
{
  name: string,        // 实体名称
  type: string,        // 类型（如 "framework", "concept"）
  description: string  // 描述
}
```

**关系结构**:
```typescript
{
  source: string,       // 源实体名称
  target: string,       // 目标实体名称
  relation_type: string, // 关系类型（如 "implements", "depends_on"）
  description: string   // 关系描述
}
```

**示例请求**:
```json
{
  "text": "React is a JavaScript library for building user interfaces. It uses a virtual DOM to efficiently update the UI."
}
```

**响应**:
```json
{
  "entities": [
    {
      "name": "React",
      "type": "framework",
      "description": "A JavaScript library for building user interfaces"
    },
    {
      "name": "Virtual DOM",
      "type": "concept",
      "description": "An in-memory representation of the actual DOM"
    }
  ],
  "relationships": [
    {
      "source": "React",
      "target": "Virtual DOM",
      "relation_type": "uses",
      "description": "React uses Virtual DOM to efficiently update the UI"
    }
  ]
}
```

**状态码**:
- `200 OK` - 成功
- `503 Service Unavailable` - AI 模型不可用
- `500 Internal Server Error` - 提取失败

**注意**: 提取的知识会自动异步插入到图数据库

---

### 6. 生成向量嵌入

#### `POST /embedding`

**描述**: 为文本生成向量嵌入

**请求体**:
```typescript
{
  text: string  // 要嵌入的文本
}
```

**示例请求**:
```json
{
  "text": "Machine learning is a subset of artificial intelligence"
}
```

**响应**:
```typescript
{
  embedding: number[]  // 向量数组（维度取决于模型配置）
}
```

**示例响应**:
```json
{
  "embedding": [0.123, -0.456, 0.789, ...]  // 默认 768 维；text-embedding-3-small/large 对应 1536/3072
}
```

**状态码**:
- `200 OK` - 成功
- `503 Service Unavailable` - AI 模型不可用
- `500 Internal Server Error` - 生成失败

---

### 7. 构建图社区

#### `POST /graph/build-communities`

**描述**: 使用 Leiden 算法对知识图谱进行社区检测，并生成社区摘要

**请求**: 无请求体

**响应**:
```json
{
  "status": "accepted",
  "message": "Community building and summarization started in background."
}
```

**状态码**:
- `202 Accepted` - 任务已启动（后台执行）
- `503 Service Unavailable` - 数据库未连接
- `500 Internal Server Error` - 启动失败

**注意**: 这是一个长时间运行的任务，会在后台执行

---

### 8. 全局搜索

#### `POST /graph/global-search`

**描述**: 在知识图谱的社区摘要上执行 GraphRAG 搜索

**请求体**:
```typescript
{
  query: string,                           // 搜索查询
  search_mode?: "hybrid" | "vector",       // 搜索模式（默认 "hybrid"）
  active_ingredients?: string,             // 可选：活性成分过滤
  bypass_critic?: boolean                  // 是否跳过批评步骤（默认 false）
}
```

**示例请求**:
```json
{
  "query": "What are the key principles of distributed systems?",
  "search_mode": "hybrid",
  "bypass_critic": false
}
```

**响应**:
```typescript
{
  answer: string,           // 生成的答案
  sources?: Array<{         // 可选：引用的来源
    community_id: number,
    summary: string,
    relevance: number
  }>,
  metadata?: {              // 可选：元数据
    search_mode: string,
    communities_searched: number,
    generation_time_ms: number
  }
}
```

**示例响应**:
```json
{
  "answer": "Distributed systems are built on several key principles...",
  "sources": [
    {
      "community_id": 42,
      "summary": "This community discusses consensus algorithms...",
      "relevance": 0.89
    }
  ],
  "metadata": {
    "search_mode": "hybrid",
    "communities_searched": 15,
    "generation_time_ms": 2340
  }
}
```

**状态码**:
- `200 OK` - 成功
- `503 Service Unavailable` - 数据库未连接或图未就绪
- `500 Internal Server Error` - 搜索失败

---

### 9. 流式全局搜索

#### `POST /graph/global-search/stream`

**描述**: 使用 SSE 流式返回全局搜索结果

**请求体**: 同 `/graph/global-search`

**响应**: `text/event-stream`

**事件格式**:
```
data: {"type": "chunk", "content": "partial answer..."}

data: {"type": "done", "answer": "complete answer"}

data: {"type": "error", "error": "error message"}
```

**示例**:
```javascript
const response = await fetch('/graph/global-search/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_key'
  },
  body: JSON.stringify({ query: 'What is GraphRAG?' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

---

## 🚨 错误响应

所有端点在出错时返回统一格式：

```typescript
{
  error: string,      // 错误消息
  type: string        // 错误类型
}
```

**错误类型**:
- `ModelUnavailableError` - AI 模型不可用
- `GraphNotReadyError` - 知识图谱未构建
- `DatabaseError` - 数据库错误
- `ExtractionError` - 知识提取失败
- `SearchError` - 搜索失败

**示例**:
```json
{
  "error": "Knowledge graph not ready or empty",
  "type": "GraphNotReadyError"
}
```

---

## 📊 使用流程

### 典型工作流

1. **健康检查**
   ```bash
   curl http://localhost:8000/health
   ```

2. **提取知识**
   ```bash
   curl -X POST http://localhost:8000/extract/knowledge \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_key" \
     -d '{"text": "Your text here"}'
   ```

3. **构建社区**
   ```bash
   curl -X POST http://localhost:8000/graph/build-communities \
     -H "X-API-Key: your_key"
   ```

4. **全局搜索**
   ```bash
   curl -X POST http://localhost:8000/graph/global-search \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_key" \
     -d '{"query": "Your question"}'
   ```

---

## 🔧 配置

通过 `model_config.yaml` 按"任务"为单位配置模型、温度、max_tokens。`get_model_setting(task, key)` 会先读任务专属值，缺失则回退到顶层 `default:`。

```yaml
# 每个任务一个顶层键。下面只列示例，完整清单见 model_config.yaml
mechanism_tree:
  model_id: "gemini-3.1-flash-lite-preview"
  temperature: 1.0
  max_tokens: 8192

critic_agent:
  model_id: "gemini-3.1-pro-preview"   # 评审用高推理模型
  temperature: 0.3
  max_tokens: 4096

embeddings:
  model_id: "text-embedding-004"       # 默认 768 维；text-embedding-3-small/large 对应 1536/3072

default:
  model_id: "gemini-3.1-flash-lite-preview"
  location: "us-central1"
  project_id: "..."
  thinking_level: "LOW"                # 命中时注入 types.ThinkingConfig
```

现役任务键（2026-04）：`mechanism_tree`、`knowledge_extraction`、`community_summary`、`embeddings`、`intent_router`、`critic_agent`、`global_search`、`vector_search`、`relevance_check`、`stepping_stone`、`constraint_extraction`。未登记的任务（例如 `retrieval_alignment`、`engineering_delivery`）会落到 `default:`。

修改 yaml 后可调用 `ai_service.config.reload_model_config()` 刷新进程内缓存，无需重启。

---

## 📝 OpenAPI 文档

访问 `http://localhost:8000/docs` 查看交互式 API 文档（Swagger UI）

访问 `http://localhost:8000/redoc` 查看 ReDoc 文档
