import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ArticleListContainer from '@/components/ArticleListContainer'
import type { AccessLevel, PostStatus } from '@/generated/graphql'

// Mock IntersectionObserver for framer-motion
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

// Mock Ant Design components
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    Typography: {
      Title: ({ children }: any) => <h3>{children}</h3>,
      Text: ({ children }: any) => <span>{children}</span>,
    },
    Button: ({ children, onClick }: any) => (
      <button onClick={onClick} data-testid='button'>
        {children}
      </button>
    ),
    Alert: ({ message, description }: any) => (
      <div data-testid='alert'>
        <span>{message}</span>
        <span>{description}</span>
      </div>
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
  }
})

// Mock ArticleCard component
vi.mock('@/components/ArticleCard', () => ({
  default: ({ post }: any) => (
    <div data-testid='article-card'>
      <h3>{post.title}</h3>
    </div>
  ),
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('ArticleListContainer', () => {
  const mockPosts = [
    {
      id: '1',
      authorId: 'user1',
      title: 'Test Article 1',
      slug: 'test-article-1',
      content: 'Test content 1',
      excerpt: 'Test excerpt 1',
      tags: ['tag1', 'tag2'],
      categories: ['category1'],
      author: {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
        bio: null,
        role: 'USER' as const,
        isActive: true,
        isVerified: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        lastLoginAt: null,
        emailVerifiedAt: '2023-01-01T00:00:00Z',
        posts: [],
        postsCount: 0,
      },
      stats: {
        id: 'stats1',
        viewCount: 100,
        likeCount: 10,
        shareCount: 5,
        commentCount: 3,
        lastViewedAt: null,
        updatedAt: '2023-01-01T00:00:00Z',
      },
      createdAt: '2023-01-01T00:00:00Z',
      publishedAt: '2023-01-01T00:00:00Z',
      status: 'PUBLISHED' as PostStatus,
      accessLevel: 'PUBLIC' as AccessLevel,
      isLiked: false,
      lastEditedAt: null,
      updatedAt: '2023-01-01T00:00:00Z',
      versions: [],
      version: 1,
      coverImageUrl: null,
    },
    {
      id: '2',
      authorId: 'user1',
      title: 'Test Article 2',
      slug: 'test-article-2',
      content: 'Test content 2',
      excerpt: 'Test excerpt 2',
      tags: ['tag3', 'tag4'],
      categories: ['category2'],
      author: {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
        bio: null,
        role: 'USER' as const,
        isActive: true,
        isVerified: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        lastLoginAt: null,
        emailVerifiedAt: '2023-01-01T00:00:00Z',
        posts: [],
        postsCount: 0,
      },
      stats: {
        id: 'stats2',
        viewCount: 50,
        likeCount: 5,
        shareCount: 2,
        commentCount: 1,
        lastViewedAt: null,
        updatedAt: '2023-01-02T00:00:00Z',
      },
      createdAt: '2023-01-02T00:00:00Z',
      publishedAt: '2023-01-02T00:00:00Z',
      status: 'PUBLISHED' as PostStatus,
      accessLevel: 'PUBLIC' as AccessLevel,
      isLiked: false,
      lastEditedAt: null,
      updatedAt: '2023-01-02T00:00:00Z',
      versions: [],
      version: 1,
      coverImageUrl: null,
    },
  ]

  const mockOnAction = vi.fn()

  it('renders correctly with posts', () => {
    render(
      <BrowserRouter>
        <ArticleListContainer
          posts={mockPosts}
          loading={false}
          error={undefined}
          onAction={mockOnAction}
        />
      </BrowserRouter>
    )

    expect(screen.getAllByTestId('article-card')).toHaveLength(2)
  })

  it('renders loading state', () => {
    render(
      <BrowserRouter>
        <ArticleListContainer
          posts={[]}
          loading
          error={undefined}
          onAction={mockOnAction}
        />
      </BrowserRouter>
    )

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    const error = new Error('Test error')
    render(
      <BrowserRouter>
        <ArticleListContainer
          posts={[]}
          loading={false}
          error={error}
          onAction={mockOnAction}
        />
      </BrowserRouter>
    )

    expect(screen.getByTestId('alert')).toBeInTheDocument()
    expect(screen.getByText('加载失败')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(
      <BrowserRouter>
        <ArticleListContainer
          posts={[]}
          loading={false}
          error={undefined}
          onAction={mockOnAction}
        />
      </BrowserRouter>
    )

    expect(screen.getByText('还没有文章')).toBeInTheDocument()
  })
})
