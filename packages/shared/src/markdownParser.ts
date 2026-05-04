// ---------------------------------------------------------------------------
// Markdown block + inline parsers — pure TypeScript, no React dependencies.
// Extracted to a .ts file so node's built-in test runner can import them.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Block-level parser — splits markdown into blocks
// ---------------------------------------------------------------------------
export type MdBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'list'; ordered: boolean; items: string[] }
  | {
    type: 'table';
    headers: string[];
    aligns: Array<'left' | 'center' | 'right' | undefined>;
    rows: string[][];
  }

const splitTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const parseTableAlign = (cell: string): 'left' | 'center' | 'right' | undefined => {
  const value = cell.trim()
  const left = value.startsWith(':')
  const right = value.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return undefined
}

const isTableSeparator = (line: string): boolean => {
  if (!line.includes('|')) return false
  const cells = splitTableRow(line)
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

const isTableStart = (lines: string[], index: number): boolean => {
  const header = lines[index]?.trim() ?? ''
  if (!header.includes('|')) return false
  return isTableSeparator(lines[index + 1] ?? '')
}

const normalizeTableRow = (cells: string[], width: number): string[] => {
  const normalized = cells.slice(0, width)
  while (normalized.length < width) normalized.push('')
  return normalized
}

export function parseMarkdownBlocks (source: string): MdBlock[] {
  // Remove HTML comments (like <!--rehype:...-->) and handle em-dash typos (<!– instead of <!--)
  const cleanSource = source.replace(/<!(?:--|–)[\s\S]*?(?:--|–)>/g, '')
  const lines = cleanSource.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  const flushParagraph = (text: string) => {
    const trimmed = text.trim()
    if (trimmed) blocks.push({ type: 'paragraph', text: trimmed })
  }

  let paragraphBuffer = ''

  while (i < lines.length) {
    const line = lines[i]

    if (isTableStart(lines, i)) {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      const headers = splitTableRow(lines[i])
      const aligns = splitTableRow(lines[i + 1]).map(parseTableAlign).slice(0, headers.length)
      while (aligns.length < headers.length) aligns.push(undefined)
      i += 2

      const rows: string[][] = []
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(normalizeTableRow(splitTableRow(lines[i]), headers.length))
        i++
      }

      blocks.push({
        type: 'table',
        headers,
        aligns,
        rows,
      })
      continue
    }

    // Heading: # ... ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() })
      i++
      continue
    }

    // Horizontal rule
    if (/^(---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Blockquote (collect consecutive > lines)
    if (line.startsWith('> ') || line === '>') {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n').trim() })
      continue
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    // Empty line flushes paragraph
    if (line.trim() === '') {
      flushParagraph(paragraphBuffer)
      paragraphBuffer = ''
      i++
      continue
    }

    // Default: accumulate paragraph
    paragraphBuffer += (paragraphBuffer ? '\n' : '') + line
    i++
  }

  flushParagraph(paragraphBuffer)
  return blocks
}

// ---------------------------------------------------------------------------
// Inline parser — bold, italic, code, link
// ---------------------------------------------------------------------------
export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'kbd'; text: string }
  | { type: 'link'; text: string; href: string }

export function parseInline (source: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // Order matters: bold (**) before italic (*), inline code before link, kbd
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(<kbd>(.+?)<\/kbd>)|(\[([^\]]+)\]\(([^)]+)\))/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(source)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: source.slice(lastIndex, match.index) })
    }

    if (match[2] !== undefined) {
      nodes.push({ type: 'bold', text: match[2] })
    } else if (match[4] !== undefined) {
      nodes.push({ type: 'italic', text: match[4] })
    } else if (match[6] !== undefined) {
      nodes.push({ type: 'code', text: match[6] })
    } else if (match[8] !== undefined) {
      nodes.push({ type: 'kbd', text: match[8] })
    } else if (match[10] !== undefined && match[11] !== undefined) {
      nodes.push({ type: 'link', text: match[10], href: match[11] })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < source.length) {
    nodes.push({ type: 'text', text: source.slice(lastIndex) })
  }

  return nodes
}
