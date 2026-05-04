import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import AppLayout from '@/layouts/AppLayout'

vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(),
}))

vi.mock('@/components/IconSidebar', () => ({
  default: () => <div>sidebar</div>,
}))

vi.mock('@/components/MobileBottomBar', () => ({
  default: () => <div>mobile-bar</div>,
}))

vi.mock('@/components/PageLoading', () => ({
  default: () => <div>loading</div>,
}))

vi.mock('@/components/MeshGradientBackground', () => ({
  MeshGradientBackground: () => <div>mesh</div>,
}))

vi.mock('@/components/BackToTop', () => ({
  default: () => null,
}))

vi.mock('@/components/TauriTitleBar', () => ({
  default: () => null,
}))

vi.mock('@/pages/HomePage', () => ({ default: () => <div>home</div> }))
vi.mock('@/pages/PostDetailPage', () => ({ default: () => <div>post</div> }))
vi.mock('@/pages/EditorPage', () => ({ default: () => <div>editor</div> }))
vi.mock('@/pages/LoginPage', () => ({ default: () => <div>login</div> }))
vi.mock('@/pages/RegisterPage', () => ({ default: () => <div>register</div> }))
vi.mock('@/pages/admin/AdminPage', () => ({ default: () => <div>admin</div> }))
vi.mock('@/pages/ForgotPasswordPage', () => ({ default: () => <div>forgot</div> }))
vi.mock('@/pages/SearchPage', () => ({ default: () => <div>search</div> }))
vi.mock('@/pages/ProfilePage', () => ({ default: () => <div>profile</div> }))
vi.mock('@/pages/TagsPage', () => ({ default: () => <div>tags</div> }))
vi.mock('@/pages/NotificationPage', () => ({ default: () => <div>notifications</div> }))
vi.mock('@/pages/InsightPage', () => ({ default: () => <div>insight</div> }))
vi.mock('@/pages/LiquidGlassTestPage', () => ({ default: () => <div>glass</div> }))
vi.mock('@/pages/QuickRefListPage', () => ({ default: () => <div>reference</div> }))

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    Grid: {
      ...actual.Grid,
      useBreakpoint: () => ({ md: true }),
    },
  }
})

vi.mock('@/components/ThemeProvider', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react')
  return {
    ThemeContext: ReactActual.createContext({
      theme: 'dark',
      toggle: vi.fn(),
    }),
  }
})

describe('AppLayout', () => {
  it('renders the desktop footer as a semantic glass surface instead of a hard solid bar', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/tags']}>
        <AppLayout />
      </MemoryRouter>
    )

    await screen.findByText('tags')
    const footer = container.querySelector('footer')

    expect(footer?.className).toContain('border-t')
    expect(footer?.className).toContain('border-[color:var(--surface-border)]')
    expect(footer?.className).toContain('bg-[color:var(--surface-elevated-glass)]')
    expect(footer?.className).toContain('backdrop-blur-xl')
  })
})
