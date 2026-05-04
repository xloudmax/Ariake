const SECTION_META = {
  summary: {
    title: '检索摘要',
    eyebrow: 'Search Summary',
    tone: 'neutral',
  },
  mechanism_check: {
    title: '机制校验',
    eyebrow: 'Mechanism Check',
    tone: 'success',
  },
  feasibility_check: {
    title: '可行性评估',
    eyebrow: 'Feasibility Check',
    tone: 'warning',
  },
  search_diagnostics: {
    title: '搜索诊断',
    eyebrow: 'Search Diagnostics',
    tone: 'neutral',
  },
  global_insight: {
    title: '全局洞察',
    eyebrow: 'Global Insight',
    tone: 'primary',
  },
  action_summary: {
    title: '行动摘要',
    eyebrow: 'Action Summary',
    tone: 'primary',
  },
} as const

type StructuredSectionTag = keyof typeof SECTION_META

const sectionPattern = /<([a-z_]+)>([\s\S]*?)<\/\1>/g
const legacyInsightArticlePattern = /<article class="[^"]*insight-xml-card[^"]*"[\s\S]*?<\/article>/g

const PLAIN_SECTION_ALIASES: Record<string, StructuredSectionTag> = {
  'Search Summary': 'summary',
  检索摘要: 'summary',
  'Mechanism Check': 'mechanism_check',
  机制校验: 'mechanism_check',
  'Feasibility Check': 'feasibility_check',
  可行性评估: 'feasibility_check',
  'Search Diagnostics': 'search_diagnostics',
  搜索诊断: 'search_diagnostics',
  'Global Insight': 'global_insight',
  全局洞察: 'global_insight',
  'Action Summary': 'action_summary',
  行动摘要: 'action_summary',
}

const plainSectionHeadingPattern = new RegExp(`^(${Object.keys(PLAIN_SECTION_ALIASES).map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*$`, 'gm')

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const decodeHtml = (value: string) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')

const isStructuredSectionTag = (value: string): value is StructuredSectionTag =>
  Object.prototype.hasOwnProperty.call(SECTION_META, value)

const stripHtml = (value: string) =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|article|section|details|summary|li|ul|ol|h3)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const renderParagraphs = (content: string) => {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('')
}

const renderInsightBody = (content: string) => {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return ''

  const [lead, ...rest] = paragraphs
  return `
    <div class="insight-xml-lead">${escapeHtml(lead)}</div>
    ${rest.length > 0
      ? `
        <details class="insight-xml-details">
          <summary class="insight-xml-details-summary">展开完整分析</summary>
          <div class="insight-xml-details-body">
            ${rest.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          </div>
        </details>
      `
      : ''}
  `
}

const inferVerdict = (tag: StructuredSectionTag, content: string) => {
  const normalized = content.toLowerCase()

  if (tag === 'mechanism_check') {
    if (
      normalized.includes('logically sound') ||
      normalized.includes('technically accurate') ||
      normalized.includes('valid') ||
      content.includes('逻辑上是自洽') ||
      content.includes('机制成立') ||
      content.includes('逻辑自洽')
    ) {
      return { label: 'Mechanism Sound', tone: 'success' as const }
    }
  }

  if (tag === 'feasibility_check') {
    if (
      normalized.includes('feasibility is high') ||
      normalized.includes('engineering feasibility is high') ||
      content.includes('工程可行性较高') ||
      content.includes('可行性较高')
    ) {
      return { label: 'High Feasibility', tone: 'success' as const }
    }
    if (
      normalized.includes('requires') ||
      normalized.includes('migration') ||
      content.includes('需要重构') ||
      content.includes('仍需重构')
    ) {
      return { label: 'Needs Refactor', tone: 'warning' as const }
    }
  }

  return null
}

const renderBulletSummary = (content: string) => {
  const items = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())

  if (items.length === 0) return content

  return `
    <div class="insight-xml-bullet-list">
      ${items.map((item) => `
        <div class="insight-xml-bullet-item">
          <span class="insight-xml-bullet-marker">•</span>
          <div class="insight-xml-bullet-copy">${escapeHtml(item)}</div>
        </div>
      `).join('')}
    </div>
  `
}

const prettifyDiagnosticKey = (key: string) =>
  key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const renderDiagnosticStatus = (parsed: Record<string, unknown>) => {
  if (typeof parsed.barrier_triggered !== 'boolean') {
    return ''
  }

  const triggered = parsed.barrier_triggered
  return `
    <div class="insight-xml-diagnostic-status insight-xml-diagnostic-status--${triggered ? 'warning' : 'success'}">
      <div class="insight-xml-diagnostic-status-head">
        <span class="insight-xml-diagnostic-status-label">${triggered ? 'Barrier Triggered' : 'Barrier Clear'}</span>
        <span class="insight-xml-diagnostic-status-tone">${triggered ? '高风险' : '可直接推进'}</span>
      </div>
      <span class="insight-xml-diagnostic-status-copy">${triggered ? '当前结果命中了收敛屏障，建议优先处理高确定性迁移动作。' : '当前结果未触发分歧屏障，可以直接推进后续执行项。'}</span>
    </div>
  `
}

const extractDiagnosticsFromHtml = (content: string) => {
  const entryPattern = /<div class="insight-xml-diagnostic-key">([\s\S]*?)<\/div>\s*<div class="insight-xml-diagnostic-value">([\s\S]*?)<\/div>/g
  const entries = [...content.matchAll(entryPattern)]

  if (entries.length === 0) {
    return null
  }

  const parsed: Record<string, unknown> = {}
  entries.forEach(([, rawKey, rawValue]) => {
    const key = stripHtml(rawKey)
      .toLowerCase()
      .replace(/\s+/g, '_')
    const value = stripHtml(rawValue)
    if (key === 'recommended_vector_weight') {
      parsed[key] = Number(value)
      return
    }
    if (key === 'barrier_triggered') {
      parsed[key] = value === 'true'
      return
    }
    parsed[key] = value
  })

  return parsed
}

const renderDiagnostics = (content: string) => {
  const trimmed = content
    .replace(/<h3 class="insight-xml-title">[\s\S]*?<\/h3>/g, '')
    .trim()

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const entries = Object.entries(parsed)

    return `
      ${renderDiagnosticStatus(parsed)}
      <div class="insight-xml-diagnostic-grid">
        ${entries.map(([key, value]) => `
          <div class="insight-xml-diagnostic-item">
            <div class="insight-xml-diagnostic-key">${escapeHtml(prettifyDiagnosticKey(key))}</div>
            <div class="insight-xml-diagnostic-value">${escapeHtml(String(value))}</div>
          </div>
        `).join('')}
      </div>
    `
  } catch {
    const parsed = extractDiagnosticsFromHtml(trimmed)
    if (parsed) {
      const entries = Object.entries(parsed)
      return `
        ${renderDiagnosticStatus(parsed)}
        <div class="insight-xml-diagnostic-grid">
          ${entries.map(([key, value]) => `
            <div class="insight-xml-diagnostic-item">
              <div class="insight-xml-diagnostic-key">${escapeHtml(prettifyDiagnosticKey(key))}</div>
              <div class="insight-xml-diagnostic-value">${escapeHtml(String(value))}</div>
            </div>
          `).join('')}
        </div>
      `
    }

    return `
      <pre class="insight-xml-diagnostics"><code>${escapeHtml(trimmed)}</code></pre>
    `
  }
}

const inferActionPriority = (item: string, index: number) => {
  const normalized = item.toLowerCase()

  if (normalized.includes('cleanup') || normalized.includes('archive') || normalized.includes('documentation') || normalized.includes('note')) {
    return 'P3'
  }

  if (normalized.includes('form') || normalized.includes('modernization') || normalized.includes('refactor')) {
    return 'P2'
  }

  if (normalized.includes('root') || normalized.includes('migration') || normalized.includes('compiler') || normalized.includes('entry')) {
    return 'P1'
  }

  return `P${Math.min(index + 1, 3)}`
}

const getActionLane = (priority: string) => {
  if (priority === 'P1') {
    return '立即执行'
  }

  if (priority === 'P2') {
    return '本轮重构'
  }

  return '后续清理'
}

const normalizeActionHeading = (value: string) =>
  value
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*]\s*/, '')
    .trim()

const collectActionItems = (content: string) => {
  const legacyHtmlItems = [...content.matchAll(/<div class="insight-xml-action-heading">([\s\S]*?)<\/div>[\s\S]*?(?:<div class="insight-xml-action-detail">([\s\S]*?)<\/div>)?/g)]
  if (legacyHtmlItems.length > 0) {
    return legacyHtmlItems.map(([, rawHeading, rawDetail]) => {
      const heading = stripHtml(rawHeading)
      const detail = rawDetail ? stripHtml(rawDetail) : ''
      return detail ? `${heading}: ${detail}` : heading
    })
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  const items: string[] = []

  for (const paragraph of paragraphs) {
    const lines = paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    let current = ''

    for (const line of lines) {
      const startsNewItem =
        current.length > 0 &&
        (/^\d+[.)]\s+/.test(line) || /^[-*]\s+/.test(line) || /[:：]/.test(line))

      if (startsNewItem) {
        items.push(current)
        current = line
        continue
      }

      current = current ? `${current} ${line}` : line
    }

    if (current) {
      items.push(current)
    }
  }

  return items
}

const normalizeLegacyInsightHtml = (content: string) =>
  content.replace(legacyInsightArticlePattern, (articleHtml) => {
    const rawTitle = articleHtml.match(/<h3 class="insight-xml-title">([\s\S]*?)<\/h3>/)?.[1]
    const rawEyebrow = articleHtml.match(/<span class="insight-xml-eyebrow">([\s\S]*?)<\/span>/)?.[1]
    const title = rawTitle ? stripHtml(rawTitle) : ''
    const eyebrow = rawEyebrow ? stripHtml(rawEyebrow) : ''
    const tagCandidate = PLAIN_SECTION_ALIASES[title] ?? PLAIN_SECTION_ALIASES[eyebrow]

    if (!tagCandidate) {
      return articleHtml
    }

    const rawBody = articleHtml.match(/<div class="insight-xml-body">([\s\S]*?)<\/div>\s*<\/article>/)?.[1] ?? articleHtml
    let normalizedBody = stripHtml(rawBody)

    if (tagCandidate === 'action_summary') {
      const actionItems = collectActionItems(rawBody)
      normalizedBody = actionItems.join('\n\n')
    }

    if (tagCandidate === 'search_diagnostics') {
      const diagnostics = extractDiagnosticsFromHtml(rawBody)
      normalizedBody = diagnostics ? JSON.stringify(diagnostics) : stripHtml(rawBody)
    }

    return `<${tagCandidate}>\n${normalizedBody}\n</${tagCandidate}>`
  })

const promotePlainHeadingSections = (content: string) => {
  const xmlSections = [...content.matchAll(sectionPattern)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))

  const headingMatches = [...content.matchAll(plainSectionHeadingPattern)]
    .map((match) => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      heading: match[1],
      tag: PLAIN_SECTION_ALIASES[match[1]],
    }))
    .filter((match) => !xmlSections.some((section) => match.start >= section.start && match.start < section.end))

  if (headingMatches.length === 0) {
    return content
  }

  let result = ''
  let cursor = 0

  headingMatches.forEach((match, index) => {
    const nextStart = headingMatches[index + 1]?.start ?? content.length
    const sectionBody = content.slice(match.end, nextStart).trim()

    result += content.slice(cursor, match.start)
    result += `<${match.tag}>\n${sectionBody}\n</${match.tag}>\n`
    cursor = nextStart
  })

  result += content.slice(cursor)
  return result
}

const renderActionSummary = (content: string) => {
  const items = collectActionItems(content)

  if (items.length === 0) return ''

  return `
    <div class="insight-xml-action-list">
      ${items.map((item, index) => {
        const priority = inferActionPriority(item, index)
        const lane = getActionLane(priority)

        return `
        <div class="insight-xml-action-item">
          <div class="insight-xml-action-index">${String(index + 1).padStart(2, '0')}</div>
          <div class="insight-xml-action-copy">
            <div class="insight-xml-action-heading-row">
              <div class="insight-xml-action-heading">${escapeHtml(normalizeActionHeading(/[:：]/.test(item) ? item.slice(0, item.search(/[:：]/)).trim() : item))}</div>
              <span class="insight-xml-action-priority">${priority}</span>
            </div>
            <div class="insight-xml-action-lane">${lane}</div>
            ${/[:：]/.test(item)
              ? `<div class="insight-xml-action-detail">${escapeHtml(item.slice(item.search(/[:：]/) + 1).trim())}</div>`
              : ''}
          </div>
        </div>
      ` }).join('')}
    </div>
  `
}

const renderStructuredSectionCard = (tag: StructuredSectionTag, content: string): string => {
  const meta = SECTION_META[tag]
  const verdict = inferVerdict(tag, content)
  let body = renderParagraphs(content)

  if (tag === 'summary') {
    body = renderBulletSummary(content)
  }

  if (tag === 'global_insight') {
    body = renderInsightBody(content)
  }

  if (tag === 'action_summary') {
    body = renderActionSummary(content)
  }

  if (tag === 'search_diagnostics') {
    body = renderDiagnostics(content)
  }

  return `
    <article class="insight-xml-card insight-xml-card--${meta.tone}">
      <div class="insight-xml-header">
        <span class="insight-xml-eyebrow">${meta.eyebrow}</span>
        ${verdict ? `<span class="insight-xml-verdict insight-xml-verdict--${verdict.tone}">${verdict.label}</span>` : ''}
        <h3 class="insight-xml-title">${meta.title}</h3>
      </div>
      <div class="insight-xml-body">
        ${body}
      </div>
    </article>
  `
}

const findEmbeddedPlainSectionStart = (content: string): number => {
  const lines = content.split('\n')
  let offset = 0

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (PLAIN_SECTION_ALIASES[trimmed]) {
      return offset
    }
    offset += lines[index].length + 1
  }

  return -1
}

const renderStructuredSection = (tag: StructuredSectionTag, rawContent: string): string => {
  const content = rawContent.trim()
  const embeddedSectionStart = findEmbeddedPlainSectionStart(content)

  if (embeddedSectionStart > 0) {
    const primaryContent = content.slice(0, embeddedSectionStart).trim()
    const trailingContent = content.slice(embeddedSectionStart).trim()

    return [
      primaryContent ? renderStructuredSectionCard(tag, primaryContent) : '',
      trailingContent ? transformStructuredInsightContent(trailingContent) : '',
    ].filter(Boolean).join('\n')
  }

  return renderStructuredSectionCard(tag, content)
}

export const transformStructuredInsightContent = (content: string): string => {
  let workingContent = normalizeLegacyInsightHtml(content)
  workingContent = promotePlainHeadingSections(workingContent)
  if (!workingContent.includes('<') || !workingContent.includes('>')) {
    return workingContent
  }
  sectionPattern.lastIndex = 0
  const firstSectionMatch = sectionPattern.exec(workingContent)
  if (firstSectionMatch && firstSectionMatch.index !== undefined) {
    const leadingContent = workingContent.slice(0, firstSectionMatch.index).trim()
    if (leadingContent.startsWith('- ')) {
      const summaryBlock = renderStructuredSection('summary', leadingContent)
      workingContent = `${summaryBlock}\n\n${workingContent.slice(firstSectionMatch.index)}`
    }
  }

  sectionPattern.lastIndex = 0
  return workingContent.replace(sectionPattern, (match, tag, body) => {
    if (!isStructuredSectionTag(tag)) {
      return match
    }

    return renderStructuredSection(tag, body)
  })
}
