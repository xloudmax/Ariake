import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}))

vi.mock('../layouts/AuthLayout', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}))

vi.mock('../components/ThemeProvider', () => ({
  useTheme: () => ({
    isDarkMode: false,
  }),
}))

vi.mock('../hooks', () => ({
  useAuth: () => ({
    login: vi.fn(),
    emailLogin: vi.fn(),
    verifyEmailAndLogin: vi.fn(),
    sendVerificationCode: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    loading: {
      login: false,
      emailLogin: false,
      verify: false,
      sendCode: false,
      register: false,
      verifyEmail: false,
      resetRequest: false,
      resetConfirm: false,
    },
  }),
  useAppUser: () => ({
    isAuthenticated: false,
  }),
  useAppUI: () => ({
    error: null,
    clearError: vi.fn(),
  }),
}))

describe('auth page chrome', () => {
  it('uses semantic token classes for auth field chrome and github login action', () => {
    const { container } = render(
      <div>
        <LoginPage />
        <RegisterPage />
      </div>
    )

    const prefixIcons = container.querySelectorAll('.ant-input-prefix .anticon')
    expect(prefixIcons.length).toBeGreaterThan(0)
    expect(prefixIcons[0]?.className).toContain('text-[color:var(--surface-text-muted)]')

    const dividerLabels = screen.getAllByText('或')
    expect(dividerLabels[0].className).toContain('text-[color:var(--surface-text-muted)]')

    const githubButton = screen.getByRole('button', { name: /使用 github 一键登录/i })
    expect(githubButton.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(githubButton.className).toContain('border-[color:var(--surface-border)]')
    expect(githubButton.className).not.toContain('bg-[#24292e]')
  })
})
