import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfilePage from '@/pages/ProfilePage'

const userMock = vi.hoisted(() => ({
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  bio: 'bio',
  avatar: null,
  isVerified: true,
  role: 'USER',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2024-01-03T00:00:00Z',
}))

vi.mock('@/hooks/useAppState', () => ({
  useAppUser: () => ({
    user: userMock,
    refreshUser: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('@/generated/graphql', () => ({
  useUpdateProfileMutation: () => [vi.fn(), { loading: false }],
}))

vi.mock('@/components/AvatarUpload', () => ({
  default: () => <div>avatar-upload</div>,
}))

vi.mock('@/components/ThemeToggleButton', () => ({
  default: () => <button data-testid='theme-toggle'>theme</button>,
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    userMock.isActive = true
  })

  it('renders account status cards with explicit semantic color classes', () => {
    const { container } = render(<ProfilePage />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByText('活跃').className).toContain('text-emerald-600')
    expect(screen.getByText('普通用户').className).toContain('text-blue-600')
    expect(screen.getByText('活跃').className).not.toContain('${')
    expect(container.querySelector('.profile-shell')?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
  })
})
