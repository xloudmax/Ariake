import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarkdownViewer from '@/components/MarkdownViewer'

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}))

vi.mock('remark-gfm', () => ({
  default: () => undefined,
}))

vi.mock('rehype-raw', () => ({
  default: () => undefined,
}))

vi.mock('rehype-sanitize', () => ({
  defaultSchema: { tagNames: [], attributes: {} },
  default: () => undefined,
}))

vi.mock('rehype-slug', () => ({
  default: () => undefined,
}))

vi.mock('rehype-autolink-headings', () => ({
  default: () => undefined,
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Image: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
    Grid: {
      useBreakpoint: () => ({ md: true }),
    },
    Skeleton: () => <div>loading</div>,
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('MarkdownViewer', () => {
  it('renders plain markdown content immediately without waiting for a fixed timeout', () => {
    render(<MarkdownViewer content='# Hello world' />)

    expect(screen.getByText('# Hello world')).toBeInTheDocument()
    expect(screen.queryByText('loading')).not.toBeInTheDocument()
  })
})
