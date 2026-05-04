import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'

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

describe('auth page links', () => {
  it('uses semantic primary links across login, register, and forgot-password pages', () => {
    render(
      <div>
        <LoginPage />
        <RegisterPage />
        <ForgotPasswordPage />
      </div>
    )

    expect(screen.getByRole('link', { name: '立即注册' }).className).toContain('text-[color:var(--color-primary)]')
    expect(screen.getByRole('link', { name: '直接登录' }).className).toContain('text-[color:var(--color-primary)]')
    expect(screen.getByRole('link', { name: '返回登录' }).className).toContain('text-[color:var(--color-primary)]')
  })
})
