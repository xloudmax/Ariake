// src/components/ThemeProvider.tsx
import React, { useState, useEffect, ReactNode, useContext, useMemo } from 'react'
import { ThemeContext, Theme, ThemeMode } from '@/context/ThemeContext'

export { ThemeContext }
export type { Theme, ThemeMode }

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_MODE_STORAGE_KEY = 'theme-mode'
const LEGACY_THEME_STORAGE_KEY = 'theme'

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext)
  return {
    ...context,
    isDarkMode: context.theme === 'dark'
  }
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const getSystemTheme = (): Theme => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        if (mq && mq.matches) {
          return 'dark'
        }
      } catch (_e) {
        // MatchMedia error usually happens in older browsers or non-browser environments
      }
    }

    const hasHtmlDarkClass = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    return hasHtmlDarkClass ? 'dark' : 'light'
  }

  const getInitialMode = (): ThemeMode => {
    const storedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') {
      return storedMode
    }

    const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return legacyTheme
    }

    return 'system'
  }

  const [mode, setModeState] = useState<ThemeMode>(() => getInitialMode())
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme())

  const theme = useMemo<Theme>(() => {
    return mode === 'system' ? systemTheme : mode
  }, [mode, systemTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (!mediaQuery) return

      const handleChange = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener?.('change', handleChange)
      return () => mediaQuery.removeEventListener?.('change', handleChange)
    } catch (_e) {
      // MatchMedia error
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme)

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-theme-mode', mode)
    document.documentElement.style.colorScheme = theme
  }, [mode, theme])

  const toggle = () => {
    setModeState(currentMode => {
      const currentTheme = currentMode === 'system' ? getSystemTheme() : currentMode
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
      return nextTheme
    })
  }

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode)
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
