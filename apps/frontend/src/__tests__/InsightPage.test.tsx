import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import InsightPage from '@/pages/InsightPage'

const warningMock = vi.fn()

vi.mock('@/components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ value, onChange, onKeyDown, placeholder, disabled, className, inputClassName, containerClassName }: any) => (
    <input
      data-testid='insight-search'
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`${className || ''} ${inputClassName || ''} ${containerClassName || ''}`}
    />
  ),
}))

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ label, title, extra, className }: any) => (
    <div className={className}>
      <span>{label}</span>
      <h1>{title}</h1>
      {extra}
    </div>
  ),
}))

vi.mock('@/components/PageContainer', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/MechanismTree', () => ({
  MechanismTree: ({ data }: any) => <div data-testid='mechanism-tree'>{data.title}</div>,
}))

vi.mock('@/components/MarkdownViewer', () => ({
  default: ({ content }: any) => <div data-testid='markdown-viewer'>{content}</div>,
}))

vi.mock('@/components/InsightStructuredResult', () => ({
  default: ({ sections }: any) => <div data-testid='insight-structured-result'>{sections?.global_insight?.summary}</div>,
}))

vi.mock('antd', () => ({
  App: {
    useApp: () => ({
      message: {
        warning: warningMock,
      },
    }),
  },
  Alert: ({ message, description, className }: any) => <div role='alert' className={className}>{message}{description}</div>,
  Typography: {
    Text: ({ children, className }: any) => <span className={className}>{children}</span>,
  },
  Skeleton: () => <div data-testid='skeleton'>loading</div>,
  Tooltip: ({ children }: any) => <>{children}</>,
  Button: ({ children, onClick, className, loading }: any) => (
    <button onClick={onClick} className={className} disabled={loading}>
      {children}
    </button>
  ),
}))

describe('InsightPage', () => {
  beforeEach(() => {
    warningMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders a unified command bar and semantic example chips in the idle state', () => {
    const { container } = render(<InsightPage />)

    expect(container.querySelector('.insight-command-bar')?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(container.querySelector('.insight-mode-switch')).toBeTruthy()
    expect(container.querySelector('.insight-empty-shell')).toBeTruthy()
    expect(screen.getByRole('button', { name: /React 19/i }).className).toContain('insight-example-chip')
  })

  it('renders a shared local results shell after a successful local search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodes: [{ id: 'react', name: 'React', description: 'UI library', community_id: 1 }],
        edges: [],
      }),
    }))

    const { container } = render(<InsightPage />)

    fireEvent.change(screen.getByTestId('insight-search'), { target: { value: 'React' } })
    fireEvent.click(screen.getByRole('button', { name: /EXPLORE/i }))

    await waitFor(() => {
      expect(screen.getByTestId('mechanism-tree')).toBeInTheDocument()
    })

    expect(container.querySelector('.insight-results-shell')).toBeTruthy()
    expect(container.querySelector('.insight-result-badge')).toBeTruthy()
  })

  it('renders the shared result shell for global answers as well', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: '# Global answer' }),
    }))

    const { container } = render(<InsightPage />)

    fireEvent.click(screen.getByRole('button', { name: /全域分析/i }))
    fireEvent.change(screen.getByTestId('insight-search'), { target: { value: '架构设计' } })
    fireEvent.click(screen.getByRole('button', { name: /EXPLORE/i }))

    await waitFor(() => {
      expect(screen.getByTestId('markdown-viewer')).toBeInTheDocument()
    })

    expect(container.querySelector('.insight-results-shell')).toBeTruthy()
    expect(container.querySelector('.insight-result-badge')).toBeTruthy()
  })

  it('renders structured insight sections without going through MarkdownViewer when sections are present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: 'legacy answer',
        sections: {
          mechanism_check: { body: 'ok', verdict: 'sound' },
          search_diagnostics: { intent_type: 'convergent', recommended_vector_weight: 0.2, barrier_triggered: false },
          global_insight: { summary: 'structured summary', details: [] },
          action_summary: [],
        },
        format_version: 'v2',
        format_kind: 'structured_json',
        sanitized: true,
      }),
    }))

    render(<InsightPage />)

    fireEvent.click(screen.getByRole('button', { name: /全域分析/i }))
    fireEvent.change(screen.getByTestId('insight-search'), { target: { value: '架构设计' } })
    fireEvent.click(screen.getByRole('button', { name: /EXPLORE/i }))

    await waitFor(() => {
      expect(screen.getByTestId('insight-structured-result')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('markdown-viewer')).not.toBeInTheDocument()
  })
})
