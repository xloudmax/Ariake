import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import CommentSection from '@/components/CommentSection'

const commentsMock = vi.hoisted(() => ([
  {
    id: 'comment-1',
    content: '这是一条评论内容',
    createdAt: '2024-01-01T00:00:00Z',
    likeCount: 2,
    user: {
      username: 'alice',
      avatar: null,
    },
    parent: null,
    replies: [],
  },
]))

const refetchMock = vi.fn()

vi.mock('@/hooks', () => ({
  useComments: () => ({
    comments: commentsMock,
    total: commentsMock.length,
    loading: false,
    error: null,
    refetch: refetchMock,
  }),
  useCommentActionsHook: () => ({
    createComment: vi.fn(),
    likeComment: vi.fn(),
    unlikeComment: vi.fn(),
    reportComment: vi.fn(),
    loading: {
      create: false,
      like: false,
      unlike: false,
      report: false,
    },
  }),
}))

describe('CommentSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    refetchMock.mockReset()
    window.history.replaceState({}, '', '/posts/test-post')
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('uses semantic surface styles for the composer and reply callout', () => {
    render(<CommentSection blogPostId='post-1' blogPostSlug='test-post' />)

    const composer = screen.getByPlaceholderText('What are your thoughts?')
    expect(composer.className).toContain('!bg-[color:var(--surface-elevated)]')
    expect(composer.className).toContain('!border-[color:var(--surface-border)]')

    fireEvent.click(screen.getByRole('button', { name: /回复/i }))

    const replyCallout = screen.getByText(/正在回复 @alice/i).closest('div')
    expect(replyCallout?.className).toContain('border-[color:var(--color-primary-soft)]')
    expect(replyCallout?.className).toContain('bg-[color:var(--color-primary-soft)]')
  })

  it('uses the shared anchor highlight class instead of hardcoded blue utility classes', () => {
    window.history.replaceState({}, '', '/posts/test-post#comment-comment-1')

    render(<CommentSection blogPostId='post-1' blogPostSlug='test-post' />)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('这是一条评论内容').closest('#comment-comment-1')?.className).toContain('comment-anchor-highlight')
  })
})
