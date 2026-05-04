import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TagsPage from '@/pages/TagsPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

vi.mock('@/components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ placeholder, value, onChange }: any) => (
    <input data-testid='tags-search' placeholder={placeholder} value={value} onChange={onChange} />
  ),
}))

vi.mock('@/components/ArticleCard', () => ({
  default: ({ post }: any) => <div>{post.title}</div>,
}))

vi.mock('@/hooks', () => ({
  useBlogDashboard: () => ({
    tags: [{ name: 'React', count: 12 }, { name: 'TypeScript', count: 9 }],
  }),
  useEnhancedSearchHook: () => ({
    search: vi.fn(),
    results: { posts: [] },
    loading: false,
  }),
}))

vi.mock('@/generated/graphql', () => ({
  useGetTagsQuery: () => ({
    data: {
      getTags: [
        { name: 'React', count: 12 },
        { name: 'TypeScript', count: 9 },
      ],
    },
    loading: false,
  }),
  useGetCategoriesQuery: () => ({
    data: {
      getCategories: [
        { name: '前端工程', count: 6 },
      ],
    },
    loading: false,
  }),
}))

describe('TagsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('renders tag chips with semantic surface styling', () => {
    render(<TagsPage />)

    const reactTag = screen.getByRole('button', { name: /React \(12\)/i })
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(reactTag?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(reactTag?.className).toContain('border-[color:var(--surface-border)]')
    expect(reactTag?.className).toContain('rounded-full')
  })

  it('renders category cards with the same semantic surface chrome', async () => {
    render(<TagsPage />)

    fireEvent.click(screen.getByRole('tab', { name: /分类/i }))

    const categoryTitle = await screen.findByText('前端工程')
    const card = categoryTitle.closest('button')
    expect(card?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(card?.className).toContain('border-[color:var(--surface-border)]')
    expect(card?.className).toContain('backdrop-blur-xl')
  })
})
