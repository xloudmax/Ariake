import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock('../layouts/AuthLayout', () => ({
  AuthLayout: ({ title, subtitle, children }: any) => (
    <div data-testid='auth-layout'>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}))

vi.mock('../hooks', () => ({
  useAuth: () => ({
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    loading: {
      resetRequest: false,
      resetConfirm: false,
    },
  }),
}))

describe('ForgotPasswordPage', () => {
  it('uses the shared auth layout instead of a standalone solid card page', () => {
    render(<ForgotPasswordPage />)

    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /忘记密码/i })).toBeInTheDocument()
    expect(screen.getByText(/找回账户访问权限/i)).toBeInTheDocument()
  })
})
