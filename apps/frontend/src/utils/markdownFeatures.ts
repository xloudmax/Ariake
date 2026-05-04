export interface MarkdownFeatures {
  hasCode: boolean;
  hasMath: boolean;
  hasMermaid: boolean;
}

export const detectMarkdownFeatures = (content: string): MarkdownFeatures => {
  const source = content || ''
  const hasMermaid = /```mermaid[\s\S]*?```/i.test(source)
  // Only fenced code blocks should trigger heavy highlight runtime imports.
  const hasCode = /```[\w-]*[\s\S]*?```/.test(source)
  const hasMath = /(^|[^\\])\$(.+?)(^|[^\\])\$/m.test(source) || /\$\$[\s\S]+?\$\$/m.test(source)

  return {
    hasCode,
    hasMath,
    hasMermaid,
  }
}

export const countMarkdownHeadings = (content: string) => {
  if (!content) return 0

  return content
    .split('\n')
    .filter((line) => /^(#{1,6})\s+.+$/.test(line.trim()))
    .length
}
