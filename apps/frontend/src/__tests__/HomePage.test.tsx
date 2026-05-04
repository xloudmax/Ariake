import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '@/pages/HomePage'

const useBlogListMock = vi.fn()
const useBlogDashboardMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks', () => ({
  useBlogList: () => useBlogListMock(),
  useBlogDashboard: () => useBlogDashboardMock(),
}))

vi.mock('@/components/SearchAndFilter', () => ({
  default: () => <div>search-filter</div>,
}))

vi.mock('@/components/ActiveFilters', () => ({
  default: () => <div>active-filters</div>,
}))

vi.mock('@/components/ArticleListContainer', () => ({
  default: () => <div>article-list</div>,
}))

vi.mock('@/components/ArticleSkeleton', () => ({
  default: () => <div>article-skeleton</div>,
}))

vi.mock('@/components/HeroSkeleton', () => ({
  default: () => <div>hero-skeleton</div>,
}))

vi.mock('@/components/HeroCarousel', () => ({
  default: () => <div>hero-carousel</div>,
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })))

    useBlogListMock.mockReturnValue({
      posts: [],
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
      filter: {},
      sort: 'LATEST',
      setSort: vi.fn(),
      filterBySearch: vi.fn(),
      filterByTags: vi.fn(),
      filterByStatus: vi.fn(),
      clearFilters: vi.fn(),
    })

    useBlogDashboardMock.mockReturnValue({
      tags: [],
    })
  })

  it('renders the home header through the shared page-header grammar', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: /\d+月\d+日/i })).toBeInTheDocument()
    expect(screen.getByText('search-filter')).toBeInTheDocument()
    expect(screen.getByText('active-filters')).toBeInTheDocument()
    expect(screen.getByText(/星期|Today/i)).toHaveClass('text-[color:var(--color-primary)]')
  })
})
