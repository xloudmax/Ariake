import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InsightStructuredResult from '@/components/InsightStructuredResult'

describe('InsightStructuredResult', () => {
  it('renders supporting communities, posts, and retrieval diagnostics', () => {
    render(
      <InsightStructuredResult
        sections={{
          global_insight: { summary: 'Structured summary', details: [] },
          action_summary: [{ title: 'Upgrade root', detail: 'Move to createRoot.', priority: 'P1', lane: '立即执行' }],
          search_diagnostics: { intent_type: 'convergent', recommended_vector_weight: 0.2, barrier_triggered: false },
        }}
        supportingCommunities={[
          {
            community_id: 7,
            title: 'React Migration',
            summary: 'Tracks React 19 migration guidance.',
            score: 0.88,
            top_terms: ['React 19', 'Compiler'],
          },
        ]}
        supportingPosts={[
          {
            title: 'React 19 rollout notes',
            excerpt: 'Migrate root APIs first.',
            community_id: 7,
            source: 'community_summary',
          },
        ]}
        retrievalDiagnostics={{
          search_mode: 'hybrid',
          communities_considered: 4,
          communities_retained: 2,
          bridge_strength: 'strong',
          ranking_formula: 'score = semantic_similarity*0.70 + exact_alias_match*0.30',
        }}
      />
    )

    expect(screen.getByText('检索证据')).toBeInTheDocument()
    expect(screen.getByText('React Migration')).toBeInTheDocument()
    expect(screen.getByText('React 19 rollout notes')).toBeInTheDocument()
    expect(screen.getByText('2/4')).toBeInTheDocument()
  })
})
