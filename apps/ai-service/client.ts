/**
 * AI Service TypeScript Client
 * Usage example for frontend integration
 */

import type {
  AIServiceConfig,
  RequestOptions,
  HealthResponse,
  DBHealthResponse,
  GenerateTreeRequest,
  MechanismTreeResponse,
  KnowledgeExtractionRequest,
  KnowledgeExtractionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  GlobalSearchRequest,
  GlobalSearchResponse,
  BackgroundTaskResponse,
  ErrorResponse,
  StreamEvent,
} from './types';

export class AIServiceClient {
  private baseURL: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: AIServiceConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    path: string,
    options: RequestInit & RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(`${error.type}: ${error.error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async dbHealth(): Promise<DBHealthResponse> {
    return this.request<DBHealthResponse>('/db-health');
  }

  // ============================================================================
  // Mechanism Tree
  // ============================================================================

  async generateMechanismTree(
    request: GenerateTreeRequest,
    options?: RequestOptions
  ): Promise<MechanismTreeResponse> {
    return this.request<MechanismTreeResponse>('/generate/mechanism-tree', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  async *streamMechanismTree(
    request: GenerateTreeRequest,
    options?: RequestOptions
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${this.baseURL}/generate/mechanism-tree/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data as StreamEvent;
        }
      }
    }
  }

  // ============================================================================
  // Knowledge Graph
  // ============================================================================

  async extractKnowledge(
    request: KnowledgeExtractionRequest,
    options?: RequestOptions
  ): Promise<KnowledgeExtractionResponse> {
    return this.request<KnowledgeExtractionResponse>('/extract/knowledge', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  async generateEmbedding(
    request: EmbeddingRequest,
    options?: RequestOptions
  ): Promise<EmbeddingResponse> {
    return this.request<EmbeddingResponse>('/embedding', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  async buildCommunities(options?: RequestOptions): Promise<BackgroundTaskResponse> {
    return this.request<BackgroundTaskResponse>('/graph/build-communities', {
      method: 'POST',
      ...options,
    });
  }

  // ============================================================================
  // Search
  // ============================================================================

  async globalSearch(
    request: GlobalSearchRequest,
    options?: RequestOptions
  ): Promise<GlobalSearchResponse> {
    return this.request<GlobalSearchResponse>('/graph/global-search', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  async *streamGlobalSearch(
    request: GlobalSearchRequest,
    options?: RequestOptions
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${this.baseURL}/graph/global-search/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data as StreamEvent;
        }
      }
    }
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

// Initialize client
const client = new AIServiceClient({
  baseURL: 'http://localhost:8000',
  apiKey: process.env.AI_SERVICE_API_KEY,
  timeout: 60000,
});

// Example 1: Health check
async function checkHealth() {
  const health = await client.health();
  console.log('Service status:', health.status);
}

// Example 2: Generate mechanism tree
async function generateTree() {
  const result = await client.generateMechanismTree({
    query: 'How do geckos climb walls?',
  });
  console.log('Root mechanism:', result.tree_metadata.root_mechanism);
  console.log('Nodes:', result.nodes.length);
}

// Example 3: Stream mechanism tree
async function streamTree() {
  for await (const event of client.streamMechanismTree({
    query: 'How do birds fly?',
  })) {
    if (event.type === 'node') {
      console.log('New node:', event.data);
    } else if (event.type === 'done') {
      console.log('Complete!');
    }
  }
}

// Example 4: Extract knowledge
async function extractKnowledge() {
  const result = await client.extractKnowledge({
    text: 'React is a JavaScript library for building user interfaces.',
  });
  console.log('Entities:', result.entities);
  console.log('Relationships:', result.relationships);
}

// Example 5: Global search with streaming
async function searchWithStreaming() {
  let fullAnswer = '';
  
  for await (const event of client.streamGlobalSearch({
    query: 'What are the key principles of distributed systems?',
    search_mode: 'hybrid',
  })) {
    if (event.type === 'chunk') {
      fullAnswer += event.content;
      console.log('Chunk:', event.content);
    } else if (event.type === 'done') {
      console.log('Final answer:', event.answer);
    }
  }
}

// Example 6: Error handling
async function withErrorHandling() {
  try {
    await client.globalSearch({ query: 'test' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('GraphNotReadyError')) {
        console.error('Graph not ready. Please build communities first.');
      } else {
        console.error('Error:', error.message);
      }
    }
  }
}

export default AIServiceClient;
