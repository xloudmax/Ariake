import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PostDetailPage from '@/pages/PostDetailPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'test-post' }),
  useNavigate: () => navigateMock,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock('@/api/graphql', () => ({
  POST_QUERY: {},
}))

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>()
  return {
    ...actual,
    useQuery: () => ({
      data: {
        post: {
          id: 'post-1',
          slug: 'test-post',
          title: '测试文章标题',
          excerpt: '这是一段用于测试统一头部的摘要。',
          content: '# Hello',
          tags: ['React', 'TypeScript'],
          status: 'PUBLISHED',
          notionPageId: null,
          createdAt: '2024-01-01T00:00:00Z',
          publishedAt: '2024-01-02T00:00:00Z',
          author: {
            username: 'author',
            avatar: null,
          },
          stats: {
            viewCount: 12,
            likeCount: 4,
            commentCount: 3,
          },
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    }),
  }
})

vi.mock('@/hooks', () => ({
  useAppUser: () => ({
    user: null,
    isAuthenticated: false,
  }),
  useLike: () => ({
    isLiked: false,
    likeCount: 4,
    handleLike: vi.fn(),
  }),
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

vi.mock('@/components/MarkdownViewer', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}))

vi.mock('@/components/CommentSection', () => ({
  default: () => <div>comments</div>,
}))

vi.mock('@/components/TableOfContents', () => ({
  default: () => <aside>toc</aside>,
}))

vi.mock('@/components/BackToTop', () => ({
  default: () => null,
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

describe('PostDetailPage', () => {
  it('renders the unified reading header with theme toggle and post metadata', () => {
    render(<PostDetailPage />)

    expect(screen.getByRole('heading', { name: /测试文章标题/i })).toBeInTheDocument()
    expect(screen.getByText('这是一段用于测试统一头部的摘要。')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /返回/i })).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('keeps article actions as labeled pills instead of icon-only chrome', () => {
    render(<PostDetailPage />)

    expect(screen.getByRole('button', { name: /点赞\s*4/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /分享/i })).toBeInTheDocument()
  })
})
