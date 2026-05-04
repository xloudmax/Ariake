import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import ThemeProvider, { useTheme } from '@/components/ThemeProvider'

function ThemeConsumer () {
  const themeApi = useTheme() as ReturnType<typeof useTheme> & {
    mode?: 'system' | 'light' | 'dark';
    setMode?: (mode: 'system' | 'light' | 'dark') => void;
  }

  return (
    <div>
      <div data-testid='theme'>{themeApi.theme}</div>
      <div data-testid='mode'>{themeApi.mode ?? 'missing'}</div>
      <button onClick={() => themeApi.setMode?.('light')}>light</button>
      <button onClick={() => themeApi.setMode?.('dark')}>dark</button>
      <button onClick={() => themeApi.setMode?.('system')}>system</button>
      <button onClick={() => themeApi.toggle()}>toggle</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('restores system mode and applies the system dark theme', () => {
    localStorage.setItem('theme-mode', 'system')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('mode')).toHaveTextContent('system')
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('setMode(light) persists explicit mode and applies light theme', () => {
    localStorage.setItem('theme-mode', 'system')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    act(() => {
      screen.getByText('light').click()
    })

    expect(screen.getByTestId('mode')).toHaveTextContent('light')
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorage.getItem('theme-mode')).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('toggle() exits system mode and persists an explicit theme', () => {
    localStorage.setItem('theme-mode', 'system')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    act(() => {
      screen.getByText('toggle').click()
    })

    expect(screen.getByTestId('mode')).toHaveTextContent('light')
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorage.getItem('theme-mode')).toBe('light')
  })
})
