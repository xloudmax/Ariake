import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BellOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/PageHeader'

vi.mock('@/components/ThemeToggleButton', () => ({
  default: ({ showLabel }: { showLabel?: boolean }) => (
    <button data-testid='theme-toggle'>{showLabel ? 'theme-with-label' : 'theme'}</button>
  ),
}))

describe('PageHeader', () => {
  it('renders actions and extra content in dedicated regions', () => {
    render(
      <PageHeader
        title='标签与分类'
        actions={<button>筛选</button>}
        extra={<div>search-box</div>}
      />
    )

    expect(screen.getByRole('heading', { name: '标签与分类' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '筛选' })).toBeInTheDocument()
    expect(screen.getByText('search-box')).toBeInTheDocument()
  })

  it('can render a built-in theme toggle', () => {
    render(<PageHeader title='全局搜索' showThemeToggle />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('uses semantic accent classes for header label and icon', () => {
    render(
      <PageHeader
        title='通知中心'
        label='消息'
        icon={<BellOutlined />}
      />
    )

    expect(screen.getByText('消息').className).toContain('text-[color:var(--color-primary)]')
    expect(screen.getByRole('img', { name: 'bell' }).parentElement?.className).toContain('text-[color:var(--color-primary)]')
  })
})
