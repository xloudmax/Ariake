import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuickRefListPage from '@/pages/QuickRefListPage'

const navigateMock = vi.fn()
const filterByTagsMock = vi.fn()
const filterBySearchMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

vi.mock('@/components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ placeholder, value, onChange }: any) => (
    <input
      data-testid='quickref-search'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
}))

vi.mock('@/hooks', () => ({
  useBlogList: () => ({
    posts: [],
    loading: false,
    filterByTags: filterByTagsMock,
    filterBySearch: filterBySearchMock,
    loadMore: vi.fn(),
    hasMore: false,
  }),
}))

describe('QuickRefListPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    filterByTagsMock.mockReset()
    filterBySearchMock.mockReset()
  })

  it('renders the unified header with search and theme toggle', () => {
    const { container } = render(<QuickRefListPage />)

    expect(screen.getByRole('heading', { name: /知识卡片/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索速查表...')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(filterByTagsMock).toHaveBeenCalledWith(['QuickRef'])
    expect(container.querySelector('.max-w-6xl')).not.toBeInTheDocument()
  })
})
