import { describe, it, expect, vi } from 'vitest'

import { render, screen } from '@testing-library/react'
import SearchAndFilter from '@/components/SearchAndFilter'

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

// Mock Liquid components to avoid canvas issues in JSDOM
vi.mock('../components/LiquidButton', () => ({
  LiquidButton: ({ children, onClick, className, icon }: any) => (
    <button onClick={onClick} className={className} data-testid='liquid-button'>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('@/components/LiquidButton', () => ({
  LiquidButton: ({ children, onClick, className, icon }: any) => (
    <button onClick={onClick} className={className} data-testid='liquid-button'>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('../components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ onSearch, placeholder, value, children }: any) => (
    <div>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch && onSearch(e.target.value)}
        data-testid='liquid-search-box'
      />
      {children}
    </div>
  ),
}))

vi.mock('@/components/LiquidSearchBox', () => ({
  LiquidSearchBox: ({ onSearch, placeholder, value, children }: any) => (
    <div>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch && onSearch(e.target.value)}
        data-testid='liquid-search-box'
      />
      {children}
    </div>
  ),
}))

vi.mock('../components/LiquidKit/filter', () => ({
  LiquidFilter: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/LiquidKit/filter', () => ({
  LiquidFilter: ({ children }: any) => <>{children}</>,
}))

// Mock Ant Design components
vi.mock('antd', () => {
  const Option = ({ children, value }: any) => (
    <option value={value}>{children}</option>
  )

  return {
    Input: {
      Search: ({ placeholder, onSearch, value, onChange }: any) => (
        <input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e)
            if (onSearch) onSearch(e.target.value)
          }}
          data-testid='search-input'
        />
      ),
    },
    Select: Object.assign(
      ({ children, placeholder, mode, value, onChange }: any) => (
        <select
          data-testid='select'
          aria-label={placeholder}
          multiple={mode === 'multiple'}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
        >
          {children}
        </select>
      ),
      { Option }
    ),
    Button: ({ children, onClick, icon }: any) => (
      <button onClick={onClick} data-testid='button'>
        {icon}
        {children}
      </button>
    ),
    Space: ({ children }: any) => <div data-testid='space'>{children}</div>,
    Tag: ({ children, closable, onClose }: any) => (
      <span data-testid='tag'>
        {children}
        {closable && <button onClick={onClose}>×</button>}
      </span>
    ),
    Popover: ({ children, content }: any) => (
      <div data-testid='popover'>
        <div data-testid='popover-trigger'>{children}</div>
        <div data-testid='popover-content'>{content}</div>
      </div>
    ),
    ConfigProvider: ({ children }: any) => (
      <div data-testid='config-provider'>{children}</div>
    ),
    Grid: {
      useBreakpoint: () => ({ md: true }),
    },
  }
})

// Mock Ant Design icons
vi.mock('@ant-design/icons', () => ({
  SearchOutlined: () => <span data-testid='search-icon'>🔍</span>,
  FilterOutlined: () => <span data-testid='filter-icon'>🔽</span>,
  CloseOutlined: () => <span data-testid='close-icon'>✕</span>,
}))

describe('SearchAndFilter', () => {
  const mockOnSearch = vi.fn()
  const mockOnFilter = vi.fn()
  const mockOnClearFilters = vi.fn()
  const mockAllTags = ['tag1', 'tag2', 'tag3']

  const defaultProps = {
    onSearch: mockOnSearch,
    onFilter: mockOnFilter,
    activeFilters: {},
    onClearFilters: mockOnClearFilters,
    allTags: mockAllTags,
  }

  it('renders correctly', () => {
    render(<SearchAndFilter {...defaultProps} />)

    expect(screen.getByPlaceholderText('Search topics...')).toBeInTheDocument()
  })

  it('renders tag options', () => {
    render(<SearchAndFilter {...defaultProps} />)

    // Check if tags are rendered in the select dropdown
    const selects = screen.getAllByTestId('select')
    expect(selects).toHaveLength(3) // Sort select, Tags select, and Status select
    expect(selects[1]).toHaveAttribute('multiple')
  })

  it('renders status options', () => {
    render(<SearchAndFilter {...defaultProps} />)

    // Check if status options are available
    const selectElements = screen.getAllByTestId('select')
    expect(selectElements).toHaveLength(3) // Sort select, Tags select, and Status select
  })

  it('can render a theme toggle next to the search control', () => {
    render(<SearchAndFilter {...defaultProps} showThemeToggle />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('uses semantic token chrome for filter labels and trigger button', () => {
    render(<SearchAndFilter {...defaultProps} activeFilters={{ tags: ['tag1'] }} />)

    expect(screen.getByText('SORT BY').className).toContain('text-[color:var(--surface-text-muted)]')
    expect(screen.getAllByTestId('liquid-button')[0].className).toContain('!text-[color:var(--color-primary)]')
    expect(screen.getAllByTestId('liquid-button')[0].className).toContain('!bg-[color:var(--color-primary-soft)]/20')
  })
})
