import { describe, expect, it } from 'vitest'
import { countMarkdownHeadings, detectMarkdownFeatures } from '@/utils/markdownFeatures'

describe('markdownFeatures', () => {
  it('detects plain markdown without enhanced features', () => {
    expect(detectMarkdownFeatures('# Hello\n\nJust text.')).toEqual({
      hasCode: false,
      hasMath: false,
      hasMermaid: false,
    })
  })

  it('detects code, math, and mermaid blocks independently', () => {
    expect(detectMarkdownFeatures('```ts\nconst x = 1\n```')).toMatchObject({ hasCode: true, hasMath: false, hasMermaid: false })
    expect(detectMarkdownFeatures('$E=mc^2$')).toMatchObject({ hasMath: true })
    expect(detectMarkdownFeatures('```mermaid\ngraph TD;\n```')).toMatchObject({ hasCode: true, hasMermaid: true })
  })

  it('counts markdown headings for TOC gating', () => {
    expect(countMarkdownHeadings('# One\n## Two\n### Three')).toBe(3)
  })
})
