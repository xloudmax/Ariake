import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleListContainer from '@/components/ArticleListContainer'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/utils/performance', () => ({
  shouldReduceEffects: () => true,
}))

vi.mock('@/components/ArticleCard', () => ({
  default: ({ post }: any) => <article>{post.title}</article>,
}))

describe('ArticleListContainer', () => {
  it('uses semantic loading and empty states instead of legacy blue/gray utility chrome', () => {
    const { rerender, container } = render(<ArticleListContainer posts={[]} loading />)

    const loadingSpinner = container.querySelector('.animate-spin')
    expect(loadingSpinner?.className).toContain('border-[color:var(--color-primary)]')
    expect(screen.getByText('加载中...').className).toContain('text-[color:var(--surface-text-muted)]')

    rerender(<ArticleListContainer posts={[]} loading={false} />)

    expect(screen.getByText('还没有文章').className).toContain('text-[color:var(--surface-text-muted)]')
  })
})
