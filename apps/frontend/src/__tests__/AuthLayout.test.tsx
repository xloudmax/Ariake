import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthLayout } from '@/layouts/AuthLayout'

vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    isDarkMode: false,
  }),
}))

vi.mock('@/components/TauriTitleBar', () => ({
  default: () => <div data-testid='tauri-title-bar' />,
}))

vi.mock('@/components/liquid-system', () => ({
  CheapGlass: ({ children, className }: any) => (
    <div data-testid='cheap-glass' className={className}>
      {children}
    </div>
  ),
}))

describe('AuthLayout', () => {
  it('uses semantic text tokens for its header instead of hardcoded theme colors', () => {
    render(
      <AuthLayout title='欢迎回来' subtitle='继续创作'>
        <div>content</div>
      </AuthLayout>
    )

    expect(screen.getByRole('heading', { name: '欢迎回来' }).className).toContain('text-[color:var(--surface-text)]')
    expect(screen.getByText('继续创作').className).toContain('text-[color:var(--surface-text-muted)]')
  })
})
