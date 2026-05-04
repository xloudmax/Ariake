export type EditorMode = 'create' | 'edit'
export type EditorErrorKind = 'network' | 'permission' | 'unknown' | 'validation'
export type MarkdownAction = 'bold' | 'code' | 'heading' | 'italic' | 'link' | 'list'
export type EditorTextSelection = { end: number; start: number }
export type PublishChecklistKey = 'content' | 'cover' | 'excerpt' | 'tags' | 'title'
export type PublishChecklistItem = {
  complete: boolean;
  key: PublishChecklistKey;
  required: boolean;
}
export type EditorQualityIssueKey = 'contentShort' | 'coverMissing' | 'excerptMissing' | 'tagsMissing' | 'titleLong' | 'titleShort'
export type EditorQualityIssue = {
  key: EditorQualityIssueKey;
  severity: 'recommended' | 'required';
}
export type EditorQualityScore = {
  issues: EditorQualityIssue[];
  score: number;
}

export type BaseEditorState = {
  content: string;
  coverImageUrl?: string | null;
  excerpt?: string | null;
  tags: string[];
  title: string;
}

const normalizeText = (value?: string | null) => value?.trim() || undefined

export const isCoverImageUrlValid = (value?: string | null) => {
  const normalized = normalizeText(value)
  if (!normalized) return true

  try {
    const url = new URL(normalized)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const getPublishChecklist = (state: BaseEditorState): PublishChecklistItem[] => ([
  { complete: !!state.title.trim(), key: 'title', required: true },
  { complete: !!state.content.trim(), key: 'content', required: true },
  { complete: !!normalizeText(state.excerpt), key: 'excerpt', required: false },
  { complete: !!normalizeText(state.coverImageUrl) && isCoverImageUrlValid(state.coverImageUrl), key: 'cover', required: false },
  { complete: state.tags.length > 0, key: 'tags', required: false },
])

export const getEditorQualityScore = (state: BaseEditorState): EditorQualityScore => {
  const issues: EditorQualityIssue[] = []
  const title = state.title.trim()
  const content = state.content.trim()

  if (title.length < 8) issues.push({ key: 'titleShort', severity: 'required' })
  if (title.length > 72) issues.push({ key: 'titleLong', severity: 'recommended' })
  if (content.length < 120) issues.push({ key: 'contentShort', severity: 'required' })
  if (!normalizeText(state.excerpt)) issues.push({ key: 'excerptMissing', severity: 'recommended' })
  if (!normalizeText(state.coverImageUrl) || !isCoverImageUrlValid(state.coverImageUrl)) issues.push({ key: 'coverMissing', severity: 'recommended' })
  if (state.tags.length === 0) issues.push({ key: 'tagsMissing', severity: 'recommended' })

  const score = Math.max(0, 100 - issues.reduce((total, issue) => total + (issue.severity === 'required' ? 22 : 10), 0))
  return { issues, score }
}

export const classifyEditorError = (error: unknown): EditorErrorKind => {
  const message = error instanceof Error ? error.message.toLocaleLowerCase() : String(error ?? '').toLocaleLowerCase()
  if (/unauthori[sz]ed|forbidden|permission|access denied|not allowed/.test(message)) return 'permission'
  if (/network|failed to fetch|offline|timeout|connection/.test(message)) return 'network'
  if (/validation|invalid|required|missing/.test(message)) return 'validation'
  return 'unknown'
}

export const isEditorStateValid = (state: BaseEditorState) => !!state.title.trim() && !!state.content.trim() && isCoverImageUrlValid(state.coverImageUrl)

export const getEditorDraftKey = (mode: EditorMode, slug?: string | null) => (
  mode === 'edit' && slug ? `editor:post:${slug}` : 'editor:create'
)

export const normalizeToken = (value: string) => value.trim().replace(/^#/, '')

export const addTokenToCsvList = (items: string[], value: string) => {
  const token = normalizeToken(value)
  if (!token) return items
  if (items.some((item) => item.toLocaleLowerCase() === token.toLocaleLowerCase())) return items
  return [...items, token]
}

export const removeTokenFromCsvList = (items: string[], value: string) => (
  items.filter((item) => item.toLocaleLowerCase() !== value.toLocaleLowerCase())
)

export const toCsvList = (items: string[]) => items.join(', ')

const wrapSelectedText = (
  content: string,
  selection: EditorTextSelection,
  before: string,
  after = before,
  placeholder = 'text'
) => {
  const start = Math.min(selection.start, selection.end)
  const end = Math.max(selection.start, selection.end)
  const selected = content.slice(start, end) || placeholder
  const replacement = `${before}${selected}${after}`
  return {
    content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
    selection: {
      end: start + replacement.length - after.length,
      start: start + before.length,
    },
  }
}

export const insertMarkdownSyntax = (
  content: string,
  selection: EditorTextSelection,
  action: MarkdownAction
): { content: string; selection: EditorTextSelection } => {
  const start = Math.min(selection.start, selection.end)
  const end = Math.max(selection.start, selection.end)
  const selected = content.slice(start, end)

  if (action === 'bold') return wrapSelectedText(content, selection, '**', '**', 'bold text')
  if (action === 'italic') return wrapSelectedText(content, selection, '*', '*', 'italic text')
  if (action === 'code') return wrapSelectedText(content, selection, '`', '`', 'code')
  if (action === 'link') return wrapSelectedText(content, selection, '[', '](https://)', 'link text')

  const lineStart = content.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
  if (action === 'heading') {
    const prefix = content.slice(lineStart, lineStart + 2) === '# ' ? '' : '# '
    return {
      content: `${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`,
      selection: { end: end + prefix.length, start: start + prefix.length },
    }
  }

  const replacement = selected
    ? selected.split('\n').map((line) => line.startsWith('- ') ? line : `- ${line}`).join('\n')
    : '- list item'

  return {
    content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
    selection: { end: start + replacement.length, start },
  }
}
