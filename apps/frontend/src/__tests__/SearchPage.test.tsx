import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SearchPage from '@/pages/SearchPage'

const searchHookState = vi.hoisted(() => ({
  results: null as any,
  loading: false,
  error: undefined as Error | undefined,
  search: vi.fn(),
  fetchMore: vi.fn(),
}))

const trendingHookState = vi.hoisted(() => ({
  trendingSearches: [] as string[],
  loading: false,
}))

vi.mock('@/hooks', () => ({
  useEnhancedSearchHook: () => searchHookState,
  useTrendingSearchesHook: () => trendingHookState,
}))

vi.mock('@/components/ThemeProvider', () => ({
  ThemeContext: React.createContext({ theme: 'light' }),
}))

vi.mock('@/components/LiquidButton', () => ({
  LiquidButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ placeholder }: any) => <input placeholder={placeholder} />,
}))

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, extra }: any) => <div><h1>{title}</h1>{extra}</div>,
}))

vi.mock('@/components/PageContainer', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button>theme</button>,
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock('antd', () => {
  const Card = ({ children, title, extra, className }: any) => <section className={className}><div>{title}</div><div>{extra}</div>{children}</section>
  const Select = Object.assign(({ children }: any) => <select>{children}</select>, {
    Option: ({ children, value }: any) => <option value={value}>{children}</option>,
  })
  const List = Object.assign(({ dataSource, renderItem }: any) => <div>{dataSource.map((item: any, index: number) => <div key={index}>{renderItem(item)}</div>)}</div>, {
    Item: ({ children, className }: any) => <div className={className}>{children}</div>,
  })

  return {
    Select,
    Tag: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    Card,
    List,
    Spin: () => <div>loading</div>,
    Alert: ({ message, description }: any) => <div role='alert'>{message}:{description}</div>,
    Typography: {
      Title: ({ children }: any) => <h2>{children}</h2>,
      Text: ({ children }: any) => <span>{children}</span>,
    },
    Space: ({ children }: any) => <div>{children}</div>,
    Row: ({ children }: any) => <div>{children}</div>,
    Col: ({ children }: any) => <div>{children}</div>,
    Collapse: ({ items }: any) => <div>{items.map((item: any) => <div key={item.key}>{item.children}</div>)}</div>,
    DatePicker: {
      RangePicker: () => <div>range</div>,
    },
    Slider: () => <div>slider</div>,
    Drawer: ({ open, children }: any) => open ? <div>{children}</div> : null,
    Empty: ({ description }: any) => <div>{description}</div>,
    Grid: {
      useBreakpoint: () => ({ md: false, lg: false }),
    },
  }
})

vi.mock('@ant-design/icons', () => ({
  SearchOutlined: () => <span>search</span>,
  FilterOutlined: () => <span>filter</span>,
  EyeOutlined: () => <span>eye</span>,
  LikeOutlined: () => <span>like</span>,
  CloseOutlined: () => <span>close</span>,
}))

describe('SearchPage states', () => {
  beforeEach(() => {
    localStorage.clear()
    searchHookState.results = null
    searchHookState.loading = false
    searchHookState.error = undefined
    searchHookState.search.mockReset()
    searchHookState.fetchMore.mockReset()
    trendingHookState.trendingSearches = []
    trendingHookState.loading = false
  })

  it('shows an idle state before the user searches instead of an empty-results message', () => {
    render(<SearchPage />)

    expect(screen.queryByText('找不到匹配的文章')).not.toBeInTheDocument()
  })

  it('shows the error state without also showing the empty-results state', () => {
    searchHookState.error = new Error('Failed to fetch')

    render(<SearchPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('搜索服务暂不可用')
    expect(screen.queryByText('找不到匹配的文章')).not.toBeInTheDocument()
  })

  it('renders history and suggestion chips with the shared semantic chrome', () => {
    localStorage.setItem('blog_search_history', JSON.stringify(['GraphQL']))
    trendingHookState.trendingSearches = ['TypeScript']
    searchHookState.results = {
      total: 1,
      took: '8ms',
      posts: [{
        slug: 'post-1',
        title: 'GraphQL 搜索结果',
        excerpt: '测试摘要',
        tags: ['GraphQL'],
        author: { username: 'tester' },
        stats: { viewCount: 1, likeCount: 2 },
      }],
      suggestions: ['React Compiler'],
    }

    render(<SearchPage />)

    expect(screen.getByRole('button', { name: 'GraphQL' }).className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(screen.getByRole('button', { name: 'React Compiler' }).className).toContain('bg-amber-500/10')
    expect(screen.getByRole('button', { name: 'React Compiler' }).className).toContain('rounded-full')
  })
})
