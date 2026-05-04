import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotificationPage from '@/pages/NotificationPage'

const navigateMock = vi.fn()
const notificationsMock = vi.hoisted(() => ([] as Array<Record<string, any>>))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

vi.mock('@/api/graphql/notification', () => ({
  useNotifications: () => ({ data: { notifications: notificationsMock }, loading: false, refetch: vi.fn() }),
  useMarkNotificationAsRead: () => [vi.fn()],
  useMarkAllNotificationsAsRead: () => [vi.fn()],
  useDeleteNotification: () => [vi.fn()],
  useClearAllNotifications: () => [vi.fn()],
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('NotificationPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    notificationsMock.length = 0
  })

  it('renders the unified page header actions', () => {
    render(<NotificationPage />)

    expect(screen.getByRole('heading', { name: /通知中心/i })).toBeInTheDocument()
    expect(screen.getByText('全部已读')).toBeInTheDocument()
    expect(screen.getByText('清空通知')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('renders notification items with semantic surface chrome', () => {
    notificationsMock.push({
      id: 'n-1',
      type: 'POST_LIKE',
      isRead: false,
      title: '有人点赞了你的文章',
      content: '新的互动来自读者',
      createdAt: '2024-01-01T00:00:00Z',
      relatedPost: { slug: 'test-post' },
      relatedUser: null,
    })

    render(<NotificationPage />)

    const title = screen.getByText('有人点赞了你的文章')
    const card = title.closest('article')

    expect(card?.className).toContain('border-[color:var(--surface-border)]')
    expect(card?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(card?.className).toContain('backdrop-blur-xl')
    expect(screen.getByText('未读').className).toContain('bg-[color:var(--color-error-soft)]')
  })
})
