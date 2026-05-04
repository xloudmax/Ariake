import type { ActionSummaryItem, GlobalInsightSections, RetrievalDiagnostics, SupportingCommunity, SupportingPost } from '@/types'
import './MarkdownViewer.css'

interface InsightStructuredResultProps {
  sections: GlobalInsightSections
  fallbackKind?: 'legacy_text' | 'legacy_xml' | 'legacy_html_echo' | null
  supportingCommunities?: SupportingCommunity[]
  supportingPosts?: SupportingPost[]
  retrievalDiagnostics?: RetrievalDiagnostics | null
}

type MechanismVerdict = 'sound' | 'warning' | 'fail'
type FeasibilityVerdict = 'high' | 'medium' | 'low'

const mechanismVerdictMeta: Record<MechanismVerdict, { label: string; tone: 'success' | 'warning' }> = {
  sound: { label: 'Mechanism Sound', tone: 'success' },
  warning: { label: 'Needs Caution', tone: 'warning' },
  fail: { label: 'Mechanism Failing', tone: 'warning' },
}

const feasibilityVerdictMeta: Record<FeasibilityVerdict, { label: string; tone: 'success' | 'warning' }> = {
  high: { label: 'High Feasibility', tone: 'success' },
  medium: { label: 'Needs Refactor', tone: 'warning' },
  low: { label: 'Low Feasibility', tone: 'warning' },
}

const renderParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>)

const diagnosticsRows = (sections: GlobalInsightSections) => {
  if (!sections.search_diagnostics) return []
  return [
    ['Intent Type', sections.search_diagnostics.intent_type],
    ['Recommended Vector Weight', String(sections.search_diagnostics.recommended_vector_weight)],
    ['Barrier Triggered', String(sections.search_diagnostics.barrier_triggered)],
  ]
}

const actionItems = (items?: ActionSummaryItem[]) => items ?? []

export default function InsightStructuredResult ({
  sections,
  fallbackKind = null,
  supportingCommunities = [],
  supportingPosts = [],
  retrievalDiagnostics = null,
}: InsightStructuredResultProps) {
  const mechanismVerdict = sections.mechanism_check?.verdict ? mechanismVerdictMeta[sections.mechanism_check.verdict] : null
  const feasibilityVerdict = sections.feasibility_check?.verdict ? feasibilityVerdictMeta[sections.feasibility_check.verdict] : null
  const diagnostics = diagnosticsRows(sections)
  const actions = actionItems(sections.action_summary)

  return (
    <div
      data-testid='insight-structured-result'
      data-insight-fallback={fallbackKind ?? undefined}
      className='markdown-body !bg-transparent'
    >
      {sections.thinking_summary && sections.thinking_summary.length > 0 && (
        <article className='insight-xml-card insight-xml-card--neutral'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Search Summary</span>
            <h3 className='insight-xml-title'>检索摘要</h3>
          </div>
          <div className='insight-xml-body'>
            <div className='insight-xml-bullet-list'>
              {sections.thinking_summary.map((item, index) => (
                <div key={`${item.slice(0, 24)}-${index}`} className='insight-xml-bullet-item'>
                  <span className='insight-xml-bullet-marker'>•</span>
                  <div className='insight-xml-bullet-copy'>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      {sections.mechanism_check && (
        <article className='insight-xml-card insight-xml-card--success'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Mechanism Check</span>
            {mechanismVerdict && <span className={`insight-xml-verdict insight-xml-verdict--${mechanismVerdict.tone}`}>{mechanismVerdict.label}</span>}
            <h3 className='insight-xml-title'>机制校验</h3>
          </div>
          <div className='insight-xml-body'>
            {renderParagraphs(sections.mechanism_check.body)}
          </div>
        </article>
      )}

      {sections.feasibility_check && (
        <article className='insight-xml-card insight-xml-card--warning'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Feasibility Check</span>
            {feasibilityVerdict && <span className={`insight-xml-verdict insight-xml-verdict--${feasibilityVerdict.tone}`}>{feasibilityVerdict.label}</span>}
            <h3 className='insight-xml-title'>可行性评估</h3>
          </div>
          <div className='insight-xml-body'>
            {renderParagraphs(sections.feasibility_check.body)}
          </div>
        </article>
      )}

      {sections.search_diagnostics && (
        <article className='insight-xml-card insight-xml-card--neutral'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Search Diagnostics</span>
            <h3 className='insight-xml-title'>搜索诊断</h3>
          </div>
          <div className='insight-xml-body'>
            <div className={`insight-xml-diagnostic-status insight-xml-diagnostic-status--${sections.search_diagnostics.barrier_triggered ? 'warning' : 'success'}`}>
              <div className='insight-xml-diagnostic-status-head'>
                <span className='insight-xml-diagnostic-status-label'>
                  {sections.search_diagnostics.barrier_triggered ? 'Barrier Triggered' : 'Barrier Clear'}
                </span>
                <span className='insight-xml-diagnostic-status-tone'>
                  {sections.search_diagnostics.barrier_triggered ? '高风险' : '可直接推进'}
                </span>
              </div>
              <span className='insight-xml-diagnostic-status-copy'>
                {sections.search_diagnostics.barrier_triggered
                  ? '当前结果命中了分歧屏障，建议先处理高确定性动作。'
                  : '当前结果未触发分歧屏障，可以直接推进后续执行项。'}
              </span>
            </div>
            <div className='insight-xml-diagnostic-grid'>
              {diagnostics.map(([key, value]) => (
                <div key={key} className='insight-xml-diagnostic-item'>
                  <div className='insight-xml-diagnostic-key'>{key}</div>
                  <div className='insight-xml-diagnostic-value'>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      {sections.global_insight && (
        <article className='insight-xml-card insight-xml-card--primary'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Global Insight</span>
            <h3 className='insight-xml-title'>全局洞察</h3>
          </div>
          <div className='insight-xml-body'>
            <div className='insight-xml-lead'>{sections.global_insight.summary}</div>
            {sections.global_insight.details && sections.global_insight.details.length > 0 && (
              <details className='insight-xml-details'>
                <summary className='insight-xml-details-summary'>展开完整分析</summary>
                <div className='insight-xml-details-body'>
                  {sections.global_insight.details.map((item, index) => (
                    <p key={`${item.slice(0, 24)}-${index}`}>{item}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </article>
      )}

      {actions.length > 0 && (
        <article className='insight-xml-card insight-xml-card--primary'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Action Summary</span>
            <h3 className='insight-xml-title'>行动摘要</h3>
          </div>
          <div className='insight-xml-body'>
            <div className='insight-xml-action-list'>
              {actions.map((item, index) => (
                <div key={`${item.title}-${index}`} className='insight-xml-action-item'>
                  <div className='insight-xml-action-index'>{String(index + 1).padStart(2, '0')}</div>
                  <div className='insight-xml-action-copy'>
                    <div className='insight-xml-action-heading-row'>
                      <div className='insight-xml-action-heading'>{item.title}</div>
                      <span className='insight-xml-action-priority'>{item.priority}</span>
                    </div>
                    <div className='insight-xml-action-lane'>{item.lane}</div>
                    <div className='insight-xml-action-detail'>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      {(supportingCommunities.length > 0 || supportingPosts.length > 0 || retrievalDiagnostics) && (
        <article className='insight-xml-card insight-xml-card--neutral'>
          <div className='insight-xml-header'>
            <span className='insight-xml-eyebrow'>Evidence Panel</span>
            <h3 className='insight-xml-title'>检索证据</h3>
          </div>
          <div className='insight-xml-body'>
            {retrievalDiagnostics && (
              <div className='insight-xml-diagnostic-grid'>
                <div className='insight-xml-diagnostic-item'>
                  <div className='insight-xml-diagnostic-key'>Search Mode</div>
                  <div className='insight-xml-diagnostic-value'>{retrievalDiagnostics.search_mode}</div>
                </div>
                <div className='insight-xml-diagnostic-item'>
                  <div className='insight-xml-diagnostic-key'>Communities</div>
                  <div className='insight-xml-diagnostic-value'>{retrievalDiagnostics.communities_retained}/{retrievalDiagnostics.communities_considered}</div>
                </div>
                <div className='insight-xml-diagnostic-item'>
                  <div className='insight-xml-diagnostic-key'>Bridge Strength</div>
                  <div className='insight-xml-diagnostic-value'>{retrievalDiagnostics.bridge_strength}</div>
                </div>
              </div>
            )}

            {supportingCommunities.length > 0 && (
              <div className='mt-5'>
                <div className='insight-xml-eyebrow mb-3'>Supporting Communities</div>
                <div className='insight-xml-bullet-list'>
                  {supportingCommunities.map((community) => (
                    <div key={community.community_id} className='insight-xml-bullet-item'>
                      <span className='insight-xml-bullet-marker'>•</span>
                      <div className='insight-xml-bullet-copy'>
                        <div className='font-semibold text-[color:var(--surface-text)]'>{community.title}</div>
                        <div>{community.summary}</div>
                        <div className='mt-1 text-xs text-[color:var(--surface-text-muted)]'>
                          score {community.score.toFixed(2)}
                          {community.top_terms && community.top_terms.length > 0 ? ` · ${community.top_terms.join(' / ')}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {supportingPosts.length > 0 && (
              <div className='mt-5'>
                <div className='insight-xml-eyebrow mb-3'>Supporting Posts</div>
                <div className='insight-xml-bullet-list'>
                  {supportingPosts.map((post, index) => (
                    <div key={`${post.title}-${index}`} className='insight-xml-bullet-item'>
                      <span className='insight-xml-bullet-marker'>↳</span>
                      <div className='insight-xml-bullet-copy'>
                        <div className='font-semibold text-[color:var(--surface-text)]'>{post.title}</div>
                        {post.excerpt && <div>{post.excerpt}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  )
}
