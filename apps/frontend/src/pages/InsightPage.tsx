import React, { lazy, Suspense, useState, useEffect, useTransition, useMemo } from 'react'
import { ExtendedMechanismNode, GlobalInsightSections, InsightGlobalSearchResponse, RetrievalDiagnostics, SupportingCommunity, SupportingPost } from '../types'
import { Alert, App, Skeleton, Tooltip, Button } from 'antd'
import { LiquidSearchBox } from '../components/LiquidSearchBox'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../components/PageContainer'

const MechanismTree = lazy(() =>
  import('../components/MechanismTree').then((module) => ({ default: module.MechanismTree }))
)
const MarkdownViewer = lazy(() => import('../components/MarkdownViewer'))
const InsightStructuredResult = lazy(() => import('../components/InsightStructuredResult'))

const insightShellClass = 'rounded-[28px] border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] shadow-[var(--shadow-lg)] backdrop-blur-xl'

const mechanismTreeFallback = (
  <div className={`h-full min-h-[600px] p-6 ${insightShellClass}`}>
    <Skeleton active paragraph={{ rows: 10 }} />
  </div>
)

const markdownViewerFallback = (
  <div className={`p-6 ${insightShellClass}`}>
    <Skeleton active paragraph={{ rows: 12 }} />
  </div>
)

const detectLegacyFormatKind = (answer: string | null, formatKind?: string | null): 'legacy_text' | 'legacy_xml' | 'legacy_html_echo' | null => {
  if (!answer || formatKind === 'structured_json') return null
  if (answer.includes('insight-xml-card') || answer.includes('insight-xml-action-item') || answer.includes('insight-xml-diagnostic-item')) {
    return 'legacy_html_echo'
  }
  if (/<[a-z_]+>[\s\S]*?<\/[a-z_]+>/i.test(answer)) {
    return 'legacy_xml'
  }
  return 'legacy_text'
}

// ─── Example queries for onboarding ───
const EXAMPLE_QUERIES: Record<'local' | 'global', string[]> = {
  local: ['React 19', '沙漠生态', '前端性能优化'],
  global: [
    '对比沙漠生态系统与前端技术发展的演化',
    '总结所有文章中关于架构设计的核心思想',
  ],
}

// ─── Multi-step loading messages ───
const LOADING_STEPS = {
  local: ['正在生成查询向量...', '搜索知识图谱节点...', '构建关联网络...'],
  global: ['读取社区知识摘要...', 'AI 正在推理分析...', '生成深度报告...'],
}

const MODE_META: Record<'local' | 'global', {
  accent: string;
  softBg: string;
  badge: string;
  title: string;
  subtitle: string;
  placeholder: string;
  flowIcon: string;
  resultLabel: string;
  resultHint: string;
}> = {
  local: {
    accent: 'text-[color:var(--color-primary)]',
    softBg: 'bg-[color:var(--color-primary-soft)]/20',
    badge: '局部图谱',
    title: '局部关系探索',
    subtitle: '检索知识节点并生成可视化逻辑拓扑',
    placeholder: '局部探索特定的逻辑演化...',
    flowIcon: '◌',
    resultLabel: '局部图谱结果',
    resultHint: '点击节点展开上下文，缩放查看关系链路。',
  },
  global: {
    accent: 'text-[color:var(--color-success)]',
    softBg: 'bg-[color:var(--color-success-soft)]/20',
    badge: '全域分析',
    title: '全局综合分析',
    subtitle: '聚合跨文章语义摘要，生成长文级推理结果',
    placeholder: '输入宏观问题提炼...',
    flowIcon: '◎',
    resultLabel: '全域分析结果',
    resultHint: '面向全量知识社区的综合摘要与推理结论。',
  },
}

const XAIProcessFlow = ({ mode }: { mode: 'local' | 'global' }) => {
  const modeMeta = MODE_META[mode]
  const steps = [
    { icon: '01', title: '意图解析', desc: 'Query 分析与编码' },
    { icon: '02', title: '向量检索', desc: '匹配跨领域知识库' },
    {
      icon: mode === 'local' ? '03L' : '03G',
      title: mode === 'local' ? '局部拓扑生成' : '全局社区提炼',
      desc: mode === 'local' ? '检索实体与关系链路' : '融合多维度宏观摘要',
      highlight: true
    },
    { icon: '04', title: '知识升维', desc: 'LLM 推理验证与输出' }
  ]

  return (
    <div className='insight-flow-strip flex items-center justify-center gap-2 md:gap-4 w-full mb-10 overflow-x-auto pb-2 px-2 scrollbar-hide'>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={`relative flex flex-col items-center rounded-2xl border p-3 md:p-4 transition-all duration-300 min-w-[92px] md:min-w-[124px] ${
            step.highlight
              ? `${modeMeta.softBg} border-[color:var(--color-primary-soft)] shadow-[0_16px_32px_rgba(15,23,42,0.12)]`
              : 'border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] text-[color:var(--surface-text-muted)]'
          }`}>
            <span className={`mb-1.5 font-mono text-[11px] md:text-xs font-bold tracking-[0.18em] ${step.highlight ? modeMeta.accent : 'text-[color:var(--surface-text-muted)]'}`}>{step.icon}</span>
            <span className={`mb-0.5 text-[10px] md:text-[11px] font-bold whitespace-nowrap ${step.highlight ? 'text-[color:var(--surface-text)]' : 'text-[color:var(--surface-text-secondary)]'}`}>{step.title}</span>
            <span className='text-center text-[8px] md:text-[9px] leading-tight text-[color:var(--surface-text-muted)]'>{step.desc}</span>
          </div>

          {i < steps.length - 1 && (
            <div className='relative flex w-4 md:w-8 shrink-0 items-center justify-center'>
              <div className='h-px w-full bg-[color:var(--surface-border)]' />
              <div className={`absolute h-1.5 w-1.5 rounded-full ${modeMeta.softBg}`} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const LoadingSteps = ({ mode }: { mode: 'local' | 'global' }) => {
  const modeMeta = MODE_META[mode]
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
    const timer = setInterval(() => {
      setStep(s => Math.min(s + 1, LOADING_STEPS[mode].length - 1))
    }, mode === 'global' ? 6000 : 1500)
    return () => clearInterval(timer)
  }, [mode])

  return (
    <div className={`insight-loading-shell flex w-full max-w-sm flex-col overflow-hidden p-5 relative ${insightShellClass}`}>
      <div className='mb-4 flex items-center justify-between border-b border-[color:var(--surface-border)] pb-2 text-[10px] font-mono tracking-[0.14em] text-[color:var(--surface-text-muted)]'>
        <span>{modeMeta.badge} / PROCESS</span>
        <span className={modeMeta.accent}>{modeMeta.flowIcon}</span>
      </div>

      <div className='flex flex-col gap-3 font-mono'>
        {LOADING_STEPS[mode].map((text, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 text-[11px] md:text-xs transition-all duration-300 ${
            i < step
              ? 'opacity-100 text-[color:var(--color-success)]'
              : i === step
                ? `opacity-100 scale-[1.02] origin-left ${modeMeta.accent}`
                : 'opacity-45 text-[color:var(--surface-text-muted)]'
            }`}
          >
            <span className='w-5 shrink-0 mt-[1px]'>
              {i < step ? '[✓]' : i === step ? <span className='animate-pulse'>[•]</span> : '[·]'}
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helper: count nodes/edges in tree ───
const countNodes = (node: ExtendedMechanismNode, visited = new Set<ExtendedMechanismNode>()): number => {
  if (!node || visited.has(node)) return 0
  visited.add(node)
  return 1 + (node.children?.reduce((sum, c) => sum + countNodes(c, visited), 0) ?? 0)
}
const countEdges = (node: ExtendedMechanismNode, visited = new Set<ExtendedMechanismNode>()): number => {
  if (!node || visited.has(node)) return 0
  visited.add(node)
  const childEdges = node.children?.length ?? 0
  return childEdges + (node.children?.reduce((sum, c) => sum + countEdges(c, visited), 0) ?? 0)
}

const InsightPage = () => {
  const { message } = App.useApp()
  // const { theme } = useContext(ThemeContext);

  const [query, setQuery] = useState('')
  const [graphData, setGraphData] = useState<ExtendedMechanismNode | null>(null)
  const [isGraphRAG, setIsGraphRAG] = useState(false)
  const [searchMode, setSearchMode] = useState<'local' | 'global'>('local')
  const [globalAnswer, setGlobalAnswer] = useState<string | null>(null)
  const [globalSections, setGlobalSections] = useState<GlobalInsightSections | null>(null)
  const [globalFormatKind, setGlobalFormatKind] = useState<'structured_json' | 'legacy_text' | null>(null)
  const [supportingCommunities, setSupportingCommunities] = useState<SupportingCommunity[]>([])
  const [supportingPosts, setSupportingPosts] = useState<SupportingPost[]>([])
  const [retrievalDiagnostics, setRetrievalDiagnostics] = useState<RetrievalDiagnostics | null>(null)
  const [optimisticQuery, setOptimisticQuery] = useState('')

  // const [generateTree, { loading: genLoading, error: genError }] = useGenerateMechanismTreeLazyQuery({
  //   fetchPolicy: 'network-only',
  //   onCompleted: (data) => {
  //     if (data?.generateMechanismTree) {
  //       setGraphData(data.generateMechanismTree as ExtendedMechanismNode);
  //       setIsGraphRAG(false);
  //       setGlobalAnswer(null);
  //     }
  //   }
  // });
  const genLoading = false
  const genError = null

  const [ragLoading, setRagLoading] = useState(false)
  const [ragError, setRagError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const modeMeta = MODE_META[searchMode]

  const optimisticGraph = graphData ?? (optimisticQuery && searchMode === 'local'
    ? {
        id: 'optimistic-root',
        title: `正在探索: ${optimisticQuery}...`,
        active_ingredient: '知识推理引擎运行中',
        match_reasons: ['semantic_similarity'],
        children: []
      } as ExtendedMechanismNode
    : null)

  const handleSearch = async (override?: string | React.SyntheticEvent) => {
    const searchQuery = (typeof override === 'string' ? override : query).trim()

    if (typeof override === 'string') {
      setQuery(searchQuery)
    }

    if (!searchQuery.trim()) {
      message.warning('请输入想要探索的主题！')
      return
    }

    setRagLoading(true)
    setRagError(null)
    setGlobalAnswer(null)
    setGlobalSections(null)
    setGlobalFormatKind(null)
    setSupportingCommunities([])
    setSupportingPosts([])
    setRetrievalDiagnostics(null)
    setGraphData(null)

    startTransition(() => {
      setOptimisticQuery(searchQuery)
    })

    try {
      if (searchMode === 'global') {
        setRagLoading(true)
        const response = await fetch('/api/graph/global-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        })

        if (response.ok) {
          const result: InsightGlobalSearchResponse = await response.json()
          setGlobalAnswer(result.answer ?? null)
          setGlobalSections(result.sections ?? null)
          setGlobalFormatKind(result.format_kind ?? 'legacy_text')
          setSupportingCommunities(result.supporting_communities ?? [])
          setSupportingPosts(result.supporting_posts ?? [])
          setRetrievalDiagnostics(result.retrieval_diagnostics ?? null)
          setIsGraphRAG(true)
          setOptimisticQuery('')
        } else {
          throw new Error('Global search failed')
        }
        setRagLoading(false)
        return
      }

      // Local Search Logic - Try GraphRAG first
      const response = await fetch('/api/graph/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, max_hops: 3 }), // Increased to 3 for better depth
      })

      if (response.ok) {
        const result = await response.json()
        if (result.nodes && result.nodes.length > 0) {
          // Map to format expected by rebuildTree
          const formattedNodes = result.nodes.map((n: {
            id: string
            name: string
            canonical_name?: string
            display_name?: string
            description: string
            community_id?: number
            score?: number
            seed_score?: number
            path_strength?: number
            match_reasons?: string[]
            aliases?: string[]
            source_post_ids?: string[]
          }) => ({
            id: n.id,
            community_id: n.community_id,
            canonical_name: n.canonical_name,
            aliases: n.aliases,
            score: n.score,
            seed_score: n.seed_score,
            path_strength: n.path_strength,
            match_reasons: n.match_reasons,
            source_post_ids: n.source_post_ids,
            data: { label: n.display_name || n.name, active_ingredient: n.description }
          }))
          const formattedEdges = result.edges.map((e: { source_id: string; target_id: string; confidence?: number; evidence_count?: number }) => ({
            source: e.source_id,
            target: e.target_id,
            confidence: e.confidence,
            evidence_count: e.evidence_count
          }))

          const fullTree = rebuildTree(formattedNodes, formattedEdges)
          if (fullTree) {
            setGraphData(fullTree)
            setIsGraphRAG(true)
            setOptimisticQuery('')
            return
          }
        }
      }

      // Fallback to STREAMING generation
      setIsGraphRAG(false)
      setRagLoading(true)
      const streamResponse = await fetch('/api/graph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!streamResponse.ok) throw new Error('Streaming failed')
      if (!streamResponse.body) throw new Error('No body in stream')

      const reader = streamResponse.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const discoveredNodes: Record<string, unknown>[] = []
      const discoveredEdges: Record<string, unknown>[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6).trim()
            if (dataStr === '[DONE]') break

            try {
              const event = JSON.parse(dataStr)
              if (event.type === 'metadata') {
                setOptimisticQuery('')
                setGraphData({
                  id: 'root',
                  title: event.root_mechanism,
                  active_ingredient: 'Generating hierarchy...',
                  community_id: undefined,
                  children: []
                } as ExtendedMechanismNode)
              } else if (event.type === 'node') {
                discoveredNodes.push(event.data)
                setGraphData(rebuildTree(discoveredNodes, discoveredEdges))
              } else if (event.type === 'edge') {
                discoveredEdges.push(event.data)
                setGraphData(rebuildTree(discoveredNodes, discoveredEdges))
              }
            } catch {
              // Ignore partial parse
            }
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Search error:', err)
      setOptimisticQuery('')
      setRagError('搜索过程中出现错误，请稍后再试。')
    } finally {
      setRagLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rebuildTree = (nodes: Record<string, any>[], edges: Record<string, any>[]): ExtendedMechanismNode | null => {
    if (nodes.length === 0) return null

    const nodeMap = new Map<string, ExtendedMechanismNode>()
    const hasParent = new Set<string>()

    // 1. Initialize all nodes
    nodes.forEach(n => {
      nodeMap.set(n.id, {
        id: n.id,
        title: n.data?.label || n.title || 'Untitled',
        active_ingredient: n.data?.active_ingredient || n.active_ingredient || '',
        community_id: n.community_id, // Pass the community ID
        applications: n.applications || n.data?.applications || [], // Pass applications
        canonical_name: n.canonical_name || n.data?.canonical_name,
        score: n.score ?? n.data?.score,
        seed_score: n.seed_score ?? n.data?.seed_score,
        path_strength: n.path_strength ?? n.data?.path_strength,
        match_reasons: n.match_reasons || n.data?.match_reasons || [],
        aliases: n.aliases || n.data?.aliases || [],
        source_post_ids: n.source_post_ids || n.data?.source_post_ids || [],
        children: []
      })
    })

    // 2. Build relationships
    edges.forEach(e => {
      const source = nodeMap.get(e.source)
      const target = nodeMap.get(e.target)
      if (source && target && source.id !== target.id) {
        if (!source.children) source.children = []
        // Avoid duplicate children
        if (!source.children.some((c: ExtendedMechanismNode) => c.id === target.id)) {
          source.children.push(target)
          hasParent.add(target.id)
        }
      }
    })

    // 3. Create a Virtual Root to hold all entry points
    const virtualRoot: ExtendedMechanismNode = {
      id: 'virtual-root',
      title: 'Knowledge Inference',
      active_ingredient: 'Synthesized from multiple sources',
      children: []
    }

    // 4. Any node that doesn't have a parent is a root-level node
    nodeMap.forEach(node => {
      if (!hasParent.has(node.id)) {
        virtualRoot.children?.push(node)
      }
    })

    // 5. Fallback: if somehow everything has a parent (cycle), pick the first node
    if (virtualRoot.children?.length === 0 && nodes.length > 0) {
      const firstNode = nodeMap.values().next().value
      if (firstNode) virtualRoot.children?.push(firstNode)
    }

    return virtualRoot
  }

  const loading = genLoading || ragLoading
  const error = genError || (ragError ? { message: ragError } : null)
  const legacyFallbackKind = useMemo(
    () => detectLegacyFormatKind(globalAnswer, globalFormatKind),
    [globalAnswer, globalFormatKind]
  )
  const showResultShell = Boolean(optimisticGraph || globalAnswer || globalSections || loading || isPending)

  const commandBar = useMemo(() => (
    <div className={`insight-command-bar flex w-full max-w-full flex-col gap-3 overflow-hidden p-3 md:p-4 ${insightShellClass}`}>
      <div className='flex flex-col gap-3 xl:flex-row xl:items-center'>
        <div className='insight-mode-switch flex w-full shrink-0 items-center gap-1 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] p-1 xl:w-auto'>
          {(['local', 'global'] as const).map((mode) => {
            const selected = searchMode === mode
            const meta = MODE_META[mode]
            return (
              <Tooltip key={mode} title={mode === 'local' ? '从知识图谱中检索相关概念，展示局部关系图谱' : '综合全部社区知识，生成更长篇的推理分析'} placement='bottom'>
                <button
                  onClick={() => setSearchMode(mode)}
                  className={`flex-1 rounded-xl px-4 py-2 text-left transition-all xl:flex-none ${
                    selected
                      ? `${meta.softBg} ${meta.accent} shadow-[0_12px_24px_rgba(15,23,42,0.12)]`
                      : 'text-[color:var(--surface-text-muted)] hover:bg-[color:var(--surface-elevated-glass)] hover:text-[color:var(--surface-text)]'
                  }`}
                >
                  <div className='text-[10px] font-bold tracking-[0.18em]'>{meta.badge}</div>
                  <div className='mt-0.5 text-xs font-medium'>{meta.title}</div>
                </button>
              </Tooltip>
            )
          })}
        </div>

        <div className='flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center'>
          <div className='min-w-0 flex-1'>
            <LiquidSearchBox
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
              placeholder={modeMeta.placeholder}
              containerClassName='w-full'
              height={52}
              width='100%'
              tone={searchMode === 'global' ? 'inverse' : 'brand'}
              variant='search'
              disabled={loading}
              className='w-full'
              inputClassName='px-5 text-sm md:text-base font-medium'
            />
          </div>
          <Button
            type='primary'
            size='large'
            onClick={handleSearch}
            loading={loading}
            className={`shrink-0 !h-[52px] !rounded-2xl !px-8 !text-[11px] !font-black tracking-[0.22em] border-0 shadow-lg ${
              searchMode === 'global'
                ? 'bg-emerald-600 hover:!bg-emerald-500 text-white'
                : 'bg-[color:var(--color-primary)] hover:!opacity-90 text-white'
            }`}
          >
            EXPLORE
          </Button>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--surface-text-muted)]'>
        <span className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-3 py-1 ${modeMeta.softBg}`}>
          <span className={modeMeta.accent}>{modeMeta.flowIcon}</span>
          {modeMeta.subtitle}
        </span>
        <span>支持局部图谱检索与全域长文分析两种模式</span>
      </div>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [loading, modeMeta, query, searchMode])

  return (
    <PageContainer>
      <PageHeader
        label='INTELLIGENCE ENGINE'
        title='知识洞察'
        subtitle='面向博客知识库的图谱检索与全域语义分析引擎'
        extra={commandBar}
      />

      {/* CONTENT AREA - Clean & Maximized */}
      {showResultShell && (
        <div className={`insight-results-shell relative w-full min-h-[70vh] p-4 md:p-6 transition-all duration-500 ${insightShellClass}`}>
          <div className='mb-4 flex flex-col gap-3 border-b border-[color:var(--surface-border)] pb-4 md:flex-row md:items-center md:justify-between'>
            <div className='min-w-0'>
              <div className='insight-result-badge inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase text-[color:var(--surface-text-muted)]'>
                <span className={modeMeta.accent}>{isGraphRAG ? modeMeta.flowIcon : '•'}</span>
                {isGraphRAG ? modeMeta.resultLabel : '推理生成中'}
              </div>
              <h2 className='mt-3 text-xl font-bold text-[color:var(--surface-text)] md:text-2xl'>
                {searchMode === 'global' ? '全域知识推理结果' : '局部知识图谱结果'}
              </h2>
              <p className='mt-1 text-sm text-[color:var(--surface-text-muted)]'>
                {isGraphRAG ? modeMeta.resultHint : '正在组织推理链路与结果结构，请稍候。'}
              </p>
            </div>

            {(optimisticGraph && !isPending && !globalAnswer && !globalSections && optimisticGraph.id !== 'optimistic-root') && (
              <div className='flex flex-wrap items-center gap-2'>
                <div className='insight-metric-chip inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] px-3 py-2 text-xs text-[color:var(--surface-text-secondary)]'>
                  <span className='h-2 w-2 rounded-full bg-[color:var(--color-success)]' />
                  {countNodes(optimisticGraph)} 个关联实体
                </div>
                <div className='insight-metric-chip inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] px-3 py-2 text-xs text-[color:var(--surface-text-secondary)]'>
                  <span className='h-2 w-2 rounded-full bg-[color:var(--color-primary)]' />
                  {countEdges(optimisticGraph)} 条语义关系
                </div>
              </div>
            )}
          </div>

          {(optimisticGraph || (isPending && searchMode === 'local')) && !globalAnswer && !globalSections && (
            <div className={`relative h-[72vh] transition-all duration-500 ${isPending ? 'opacity-60 grayscale-[0.2]' : 'opacity-100'}`}>
              <Suspense fallback={mechanismTreeFallback}>
                {optimisticGraph && <MechanismTree data={optimisticGraph} />}
              </Suspense>
            </div>
          )}

          {globalSections && (
            <div className='mx-auto max-w-4xl py-4 md:py-8'>
              <Suspense fallback={markdownViewerFallback}>
                <InsightStructuredResult
                  sections={globalSections}
                  fallbackKind={legacyFallbackKind}
                  supportingCommunities={supportingCommunities}
                  supportingPosts={supportingPosts}
                  retrievalDiagnostics={retrievalDiagnostics}
                />
              </Suspense>
            </div>
          )}

          {!globalSections && globalAnswer && (
            <div className='mx-auto max-w-4xl py-4 md:py-8'>
              <Suspense fallback={markdownViewerFallback}>
                <MarkdownViewer content={globalAnswer} mode='legacy-insight' />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* GUIDED EMPTY STATE */}
      {!optimisticGraph && !globalAnswer && !globalSections && !loading && !isPending && (
        <div className={`insight-empty-shell mx-auto flex max-w-4xl flex-col items-center justify-center py-12 md:py-16 px-6 text-center ${insightShellClass}`}>
          <XAIProcessFlow mode={searchMode} />

          <h2 className='mb-3 text-xl font-bold text-[color:var(--surface-text)] md:text-2xl'>
            知识图谱 × AI 推理引擎
          </h2>
          <p className='mb-8 max-w-2xl text-sm leading-relaxed text-[color:var(--surface-text-secondary)] md:text-base'>
            输入任何主题，AI 将从你的博客文章中提取知识图谱，
            {searchMode === 'local'
              ? '以可视化网络图展示概念之间的关联关系。'
              : '综合多篇文章的洞察，生成深度分析报告。'}
          </p>

          {/* Clickable example queries */}
          <div className='w-full max-w-2xl'>
            <p className='mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--surface-text-muted)]'>
              试试这些查询 ↓
            </p>
            <div className='flex flex-col gap-2'>
              {EXAMPLE_QUERIES[searchMode].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(q) }}
                  className='insight-example-chip rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-left text-sm text-[color:var(--surface-text-secondary)] transition-all hover:border-[color:var(--color-primary-soft)] hover:bg-[color:var(--surface-elevated-glass)] hover:text-[color:var(--surface-text)]'
                >
                  <span className='mr-2 opacity-50'>→</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY — multi-step progress */}
      {loading && (
        <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm'>
          <div className='flex max-w-xs flex-col items-center gap-4 px-8 py-6'>
            <div className={`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent ${searchMode === 'global' ? 'border-emerald-500' : 'border-[color:var(--color-primary)]'}`} />
            <LoadingSteps mode={searchMode} />
          </div>
        </div>
      )}

      {/* ERROR HANDLING */}
      {error && (
        <div className='mt-10 max-w-3xl mx-auto'>
          <Alert
            message='执行失败'
            description={error.message}
            type='error'
            showIcon
            className='rounded-2xl border border-[color:var(--color-error-soft)] bg-[color:var(--color-error-soft)]/20 py-4 text-[color:var(--surface-text)]'
          />
        </div>
      )}
    </PageContainer>
  )
}

export default InsightPage
