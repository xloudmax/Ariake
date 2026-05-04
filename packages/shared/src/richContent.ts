export type RichContentFeatures = {
  hasCode: boolean;
  hasImages: boolean;
  hasMath: boolean;
  hasMermaid: boolean;
  hasTable: boolean;
}

export type RichContentTheme = 'light' | 'dark' | 'system'
export type RichContentRendererKind = 'native' | 'webview'

export type RichContentMessage =
  | { type: 'height'; height: number }
  | { type: 'link'; href: string }
  | { type: 'image'; src: string; alt?: string }

const ALLOWED_MESSAGE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export const isAllowedMessageUrl = (value: unknown, allowDataImage = false): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false

  if (allowDataImage && value.startsWith('data:image/')) {
    return true
  }

  try {
    const url = new URL(value)
    return ALLOWED_MESSAGE_URL_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
}

const splitPipeTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const hasPipeTable = (source: string): boolean => {
  const lines = source.split('\n')

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index].trim()
    const separatorLine = lines[index + 1].trim()
    if (!headerLine.includes('|') || !separatorLine.includes('|')) continue

    const headerCells = splitPipeTableRow(headerLine)
    const separatorCells = splitPipeTableRow(separatorLine)
    if (headerCells.length < 2 || separatorCells.length < 2) continue

    const isSeparator = separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell))
    if (isSeparator) return true
  }

  return false
}

export const detectMobileRichContent = (content: string): RichContentFeatures => {
  const source = content || ''

  return {
    hasCode: /```[\w-]*[\s\S]*?```/.test(source),
    hasImages: /!\[[^\]]*]\((https?:\/\/[^)\s]+|data:image\/[^)\s]+)[^)]*\)/i.test(source),
    hasMath: /(^|[^\\])\$\$[\s\S]+?\$\$/m.test(source) || /(^|[^\\])\$(?!\$)(.+?)(^|[^\\])\$/m.test(source),
    hasMermaid: /```mermaid[\s\S]*?```/i.test(source),
    hasTable: hasPipeTable(source),
  }
}

export const selectRichContentRenderer = (features: RichContentFeatures): RichContentRendererKind =>
  features.hasCode || features.hasMath || features.hasMermaid || features.hasImages || features.hasTable ? 'webview' : 'native'

export const parseRichContentMessage = (raw: string): RichContentMessage | null => {
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>

    if (payload.type === 'height' && typeof payload.height === 'number') {
      const height = Math.ceil(payload.height)
      if (height > 0 && height < 20000) {
        return { type: 'height', height }
      }
      return null
    }

    if (payload.type === 'link' && isAllowedMessageUrl(payload.href)) {
      return { type: 'link', href: payload.href }
    }

    if (payload.type === 'image' && isAllowedMessageUrl(payload.src, true)) {
      return {
        type: 'image',
        src: payload.src,
        alt: typeof payload.alt === 'string' ? payload.alt : undefined,
      }
    }

    return null
  } catch {
    return null
  }
}
