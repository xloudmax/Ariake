import { describe, expect, it } from 'vitest'
import { transformStructuredInsightContent } from '@/utils/structuredInsightContent'

describe('transformStructuredInsightContent', () => {
  it('converts insight xml-like blocks into semantic card markup', () => {
    const source = `
<global_insight>
React 19 shifts optimization from manual hooks to compiler-driven automation.

This reduces memoization boilerplate across the codebase.
</global_insight>

<action_summary>
Compiler Integration & Memoization Purge: integrate the compiler.

Root Architecture Migration: move to createRoot.
</action_summary>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('insight-xml-card')
    expect(transformed).toContain('全局洞察')
    expect(transformed).toContain('行动摘要')
    expect(transformed).toContain('insight-xml-action-item')
    expect(transformed).toContain('insight-xml-lead')
    expect(transformed).toContain('insight-xml-action-index')
    expect(transformed).not.toContain('<global_insight>')
    expect(transformed).not.toContain('</action_summary>')
  })

  it('promotes leading bullet notes and diagnostics json into structured insight blocks', () => {
    const source = `
- The target problem is the architectural evaluation and migration strategy for React 19.
- Community 1 perfectly aligns with the draft.

<search_diagnostics>
{ "intent_type": "convergent", "recommended_vector_weight": 0.2, "barrier_triggered": false }
</search_diagnostics>

<action_summary>
Compiler Integration & Memoization Purge: integrate the compiler into the build pipeline.
</action_summary>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('检索摘要')
    expect(transformed).toContain('insight-xml-bullet-list')
    expect(transformed).toContain('Intent Type')
    expect(transformed).toContain('Recommended Vector Weight')
    expect(transformed).toContain('insight-xml-diagnostic-grid')
    expect(transformed).toContain('insight-xml-action-heading')
    expect(transformed).toContain('integrate the compiler into the build pipeline')
  })

  it('adds verdict badges and collapses long global insights behind a details disclosure', () => {
    const source = `
<mechanism_check>
The mechanisms described are logically sound and technically accurate within the domain of software architecture.
</mechanism_check>

<feasibility_check>
The engineering feasibility is high, but migration still requires explicit refactoring of legacy entry points.
</feasibility_check>

<global_insight>
React 19 marks a shift toward compiler-driven rendering optimization.

The migration still needs codebase-wide entry-point cleanup and form-state modernization.
</global_insight>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('insight-xml-verdict')
    expect(transformed).toContain('Mechanism Sound')
    expect(transformed).toContain('High Feasibility')
    expect(transformed).toContain('insight-xml-details')
    expect(transformed).toContain('展开完整分析')
  })

  it('adds action priorities and diagnostic status callouts for execution-focused insight results', () => {
    const source = `
<search_diagnostics>
{ "intent_type": "convergent", "recommended_vector_weight": 0.2, "barrier_triggered": true }
</search_diagnostics>

<action_summary>
Root Architecture Migration: move application entry points to createRoot.

Form State Modernization: replace custom form boilerplate with native primitives.
</action_summary>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('insight-xml-diagnostic-status')
    expect(transformed).toContain('Barrier Triggered')
    expect(transformed).toContain('insight-xml-action-priority')
    expect(transformed).toContain('P1')
    expect(transformed).toContain('P2')
  })

  it('maps action priorities to readable execution lanes and elevates barrier risk tone', () => {
    const source = `
<search_diagnostics>
{ "intent_type": "convergent", "recommended_vector_weight": 0.2, "barrier_triggered": true }
</search_diagnostics>

<action_summary>
Compiler Integration & Memoization Purge: integrate the compiler into the build pipeline.

Form State Modernization: replace custom form boilerplate with native primitives.

Documentation Cleanup: archive outdated migration notes after rollout.
</action_summary>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('insight-xml-diagnostic-status--warning')
    expect(transformed).toContain('高风险')
    expect(transformed).toContain('insight-xml-action-lane')
    expect(transformed).toContain('立即执行')
    expect(transformed).toContain('本轮重构')
    expect(transformed).toContain('后续清理')
  })

  it('promotes plain heading sections and splits dense chinese action summaries into separate items', () => {
    const source = `
<mechanism_check>
物理机制向软件架构的迁移在逻辑上是自洽的，但需注意尺度与介质差异。
</mechanism_check>

<feasibility_check>
工程可行性较高，但落地仍需重构现有渲染与状态边界。
</feasibility_check>

Search Diagnostics
{ "intent_type": "divergent", "recommended_vector_weight": 0.85, "barrier_triggered": false }

Global Insight
通过将沙漠生态系统的极端生存机制引入前端工程，我们能够构建一种仿生响应式架构。

Action Summary
1. 开发基于“拉普拉斯压力梯度”的视口资源调度器：利用 Intersection Observer API 动态计算组件优先级。
实施基于 Stigmergy 机制的瞬态状态管理：为非核心 UI 状态分配时间衰减半衰期。
构建“分层多孔”混合渲染架构：严格划分 Client Components 与 Server Components。
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('Mechanism Sound')
    expect(transformed).toContain('High Feasibility')
    expect(transformed).toContain('搜索诊断')
    expect(transformed).toContain('全局洞察')
    expect(transformed).toContain('Barrier Clear')
    expect(transformed).toContain('可直接推进')
    expect(transformed.match(/insight-xml-action-item/g)?.length).toBe(3)
    expect(transformed).not.toContain('Search Diagnostics\n')
    expect(transformed).not.toContain('Action Summary\n')
  })

  it('cuts off plain heading sections that leak into a preceding feasibility block', () => {
    const source = `
<mechanism_check>
物理机制向软件架构的迁移在逻辑上是自洽的，但需注意尺度与介质差异。
</mechanism_check>

<feasibility_check>
工程可行性较高。
“优先级压力梯度”可通过现有的 Intersection Observer API 结合动态 import() 实现。

Search Diagnostics
{ "intent_type": "divergent", "recommended_vector_weight": 0.85, "barrier_triggered": false }

Global Insight
通过将沙漠生态系统的极端生存机制引入前端工程，我们能够构建一种仿生响应式架构。

Action Summary
开发基于“拉普拉斯压力梯度”的视口资源调度器：利用 Intersection Observer API 动态计算组件优先级。
实施基于 Stigmergy 机制的瞬态状态管理：为非核心 UI 状态分配时间衰减半衰期。
构建“分层多孔”混合渲染架构：严格划分 Client Components 与 Server Components。
</feasibility_check>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('insight-xml-card insight-xml-card--warning')
    expect(transformed).toContain('insight-xml-card insight-xml-card--neutral')
    expect(transformed).toContain('insight-xml-card insight-xml-card--primary')
    expect(transformed).toContain('搜索诊断')
    expect(transformed).toContain('全局洞察')
    expect(transformed).toContain('行动摘要')
    expect(transformed).toContain('Barrier Clear')
    expect(transformed.match(/insight-xml-action-item/g)?.length).toBe(3)
    expect(transformed).not.toContain('Search Diagnostics\n')
    expect(transformed).toContain('>开发基于“拉普拉斯压力梯度”的视口资源调度器<')
    expect(transformed).not.toContain('>开发基于“拉普拉斯压力梯度”的视口资源调度器：利用 Intersection Observer API 动态计算组件优先级。<')
  })

  it('normalizes legacy insight card html into canonical structured sections', () => {
    const source = `
<article class="insight-xml-card insight-xml-card--success">
  <div class="insight-xml-header">
    <span class="insight-xml-eyebrow">Mechanism Check</span>
    <span class="insight-xml-verdict insight-xml-verdict--success">Mechanism Sound</span>
    <h3 class="insight-xml-title">机制校验</h3>
  </div>
  <div class="insight-xml-body">
    <p>物理机制向软件架构的迁移在逻辑上是自洽的，但需注意尺度与介质差异。</p>
  </div>
</article>

<article class="insight-xml-card insight-xml-card--warning">
  <div class="insight-xml-header">
    <span class="insight-xml-eyebrow">Feasibility Check</span>
    <span class="insight-xml-verdict insight-xml-verdict--success">High Feasibility</span>
    <h3 class="insight-xml-title">可行性评估</h3>
  </div>
  <div class="insight-xml-body">
    <p>工程可行性较高。</p>
  </div>
</article>

Search Diagnostics
{ "intent_type": "divergent", "recommended_vector_weight": 0.85, "barrier_triggered": false }

Action Summary
<div class="insight-xml-action-item">
  <div class="insight-xml-action-copy">
    <div class="insight-xml-action-heading-row">
      <div class="insight-xml-action-heading">开发基于“拉普拉斯压力梯度”的视口资源调度器</div>
      <span class="insight-xml-action-priority">P1</span>
    </div>
    <div class="insight-xml-action-detail">利用 Intersection Observer API 动态计算组件优先级。</div>
  </div>
</div>
    `.trim()

    const transformed = transformStructuredInsightContent(source)

    expect(transformed).toContain('Mechanism Sound')
    expect(transformed).toContain('High Feasibility')
    expect(transformed).toContain('搜索诊断')
    expect(transformed).toContain('Barrier Clear')
    expect(transformed).toContain('>开发基于“拉普拉斯压力梯度”的视口资源调度器<')
    expect(transformed).not.toContain('&lt;div class=&quot;insight-xml-action-heading&quot;&gt;')
    expect(transformed).not.toContain('Action Summary\n')
  })
})
