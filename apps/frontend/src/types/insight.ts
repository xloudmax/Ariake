export interface MechanismCheckSection {
  body: string
  verdict?: 'sound' | 'warning' | 'fail'
}

export interface FeasibilityCheckSection {
  body: string
  verdict?: 'high' | 'medium' | 'low'
}

export interface SearchDiagnosticsSection {
  intent_type: 'divergent' | 'convergent'
  recommended_vector_weight: number
  barrier_triggered: boolean
}

export interface SupportingCommunity {
  community_id: number
  title: string
  summary: string
  score: number
  representative_posts?: string[]
  top_terms?: string[]
  summary_confidence?: number
}

export interface SupportingPost {
  title: string
  excerpt?: string
  slug?: string | null
  community_id?: number | null
  source?: string
}

export interface RetrievalDiagnostics {
  search_mode: 'hybrid' | 'vector'
  communities_considered: number
  communities_retained: number
  bridge_strength: 'strong' | 'weak'
  ranking_formula?: string
}

export interface GlobalInsightSection {
  summary: string
  details?: string[]
}

export interface ActionSummaryItem {
  title: string
  detail: string
  priority: 'P1' | 'P2' | 'P3'
  lane: '立即执行' | '本轮重构' | '后续清理'
}

export interface GlobalInsightSections {
  thinking_summary?: string[]
  mechanism_check?: MechanismCheckSection
  feasibility_check?: FeasibilityCheckSection
  search_diagnostics?: SearchDiagnosticsSection
  global_insight?: GlobalInsightSection
  action_summary?: ActionSummaryItem[]
}

export interface InsightGlobalSearchResponse {
  answer: string
  sections?: GlobalInsightSections | null
  format_version?: 'v2'
  format_kind?: 'structured_json' | 'legacy_text'
  sanitized?: boolean
  is_draft?: boolean
  supporting_communities?: SupportingCommunity[]
  supporting_posts?: SupportingPost[]
  retrieval_diagnostics?: RetrievalDiagnostics | null
}
