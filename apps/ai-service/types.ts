/**
 * AI Service API TypeScript Types
 * Auto-generated from Pydantic models
 */

// ============================================================================
// Mechanism Tree Types
// ============================================================================

export interface CrossDomainApplication {
  /** Distance level: 'Close', 'Somewhat Far', or 'Distant' */
  domain: string;
  /** The concrete application example */
  example: string;
  /** The domain/field of this example */
  context: string;
  /** Actionable transfer strategy for this example */
  strategy: string;
}

export interface ReactFlowNodeData {
  title: string;
  /** A concise (max 15 words) description of the mechanism including a verb */
  active_ingredient: string;
  level: number;
  applications: CrossDomainApplication[];
}

export interface ReactFlowNode {
  id: string;
  type: "customMechanismNode";
  data: ReactFlowNodeData;
  position: { x: number; y: number };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface TreeMetadata {
  query: string;
  root_mechanism: string;
}

export interface MechanismTreeResponse {
  tree_metadata: TreeMetadata;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface GenerateTreeRequest {
  query: string;
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

export interface Entity {
  /** The name of the entity */
  name: string;
  /** The type of the entity (e.g., framework, concept, language) */
  type: string;
  /** A clear description of the entity */
  description: string;
}

export interface Relationship {
  /** Name of the source entity */
  source: string;
  /** Name of the target entity */
  target: string;
  /** The type of relationship (e.g., implements, depends_on) */
  relation_type: string;
  /** Brief description of the relationship */
  description: string;
}

export interface KnowledgeExtractionResponse {
  entities: Entity[];
  relationships: Relationship[];
}

export interface KnowledgeExtractionRequest {
  text: string;
  manual_data?: {
    entities: Entity[];
    relationships: Relationship[];
  };
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface EmbeddingRequest {
  text: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}

// ============================================================================
// Search Types
// ============================================================================

export type SearchMode = "hybrid" | "vector";

export interface GlobalSearchRequest {
  query: string;
  search_mode?: SearchMode;
  active_ingredients?: string;
  bypass_critic?: boolean;
}

export interface MechanismCheckSection {
  body: string;
  verdict?: "sound" | "warning" | "fail";
}

export interface FeasibilityCheckSection {
  body: string;
  verdict?: "high" | "medium" | "low";
}

export interface SearchDiagnosticsSection {
  intent_type: "divergent" | "convergent";
  recommended_vector_weight: number;
  barrier_triggered: boolean;
}

export interface SupportingCommunity {
  community_id: number;
  title: string;
  summary: string;
  score: number;
  representative_posts?: string[];
  top_terms?: string[];
  summary_confidence?: number;
}

export interface SupportingPost {
  title: string;
  excerpt?: string;
  slug?: string | null;
  community_id?: number | null;
  source?: string;
}

export interface RetrievalDiagnostics {
  search_mode: "hybrid" | "vector";
  communities_considered: number;
  communities_retained: number;
  bridge_strength: "strong" | "weak";
  ranking_formula?: string;
}

export interface GlobalInsightSection {
  summary: string;
  details?: string[];
}

export interface ActionSummaryItem {
  title: string;
  detail: string;
  priority: "P1" | "P2" | "P3";
  lane: "立即执行" | "本轮重构" | "后续清理";
}

export interface GlobalInsightSections {
  thinking_summary?: string[];
  mechanism_check?: MechanismCheckSection;
  feasibility_check?: FeasibilityCheckSection;
  search_diagnostics?: SearchDiagnosticsSection;
  global_insight?: GlobalInsightSection;
  action_summary?: ActionSummaryItem[];
}

export interface SearchSource {
  community_id: number;
  summary: string;
  relevance: number;
}

export interface SearchMetadata {
  search_mode: string;
  communities_searched: number;
  generation_time_ms: number;
}

export interface GlobalSearchResponse {
  answer: string;
  sections?: GlobalInsightSections;
  format_version?: "v2";
  format_kind?: "structured_json" | "legacy_text";
  sanitized?: boolean;
  is_draft?: boolean;
  supporting_communities?: SupportingCommunity[];
  supporting_posts?: SupportingPost[];
  retrieval_diagnostics?: RetrievalDiagnostics;
  sources?: SearchSource[];
  metadata?: SearchMetadata;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  service: string;
}

export interface DBHealthResponse {
  status: "connected" | "disconnected";
  pgvector_available?: boolean;
  reason?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorType =
  | "ModelUnavailableError"
  | "GraphNotReadyError"
  | "DatabaseError"
  | "ExtractionError"
  | "SearchError"
  | "UnhandledError";

export interface ErrorResponse {
  error: string;
  type: ErrorType;
}

// ============================================================================
// Streaming Types
// ============================================================================

export type StreamEventType = "node" | "edge" | "chunk" | "done" | "error";

export interface StreamEvent<T = any> {
  type: StreamEventType;
  data?: T;
  content?: string;
  answer?: any;
  error?: string;
}

// ============================================================================
// API Client Types
// ============================================================================

export interface AIServiceConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

// ============================================================================
// Background Task Types
// ============================================================================

export interface BackgroundTaskResponse {
  status: "accepted";
  message: string;
}
