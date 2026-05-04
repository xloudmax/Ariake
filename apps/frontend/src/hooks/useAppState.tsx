import { useState, useEffect, useContext, ReactNode } from 'react'
import { useCurrentUser, useAuth } from '@/api/graphql/auth'
import { AppContext, AppState, AppActions } from '@/context/AppContext'
import { ThemeContext } from '@/components/ThemeProvider'
import { tokenStorage } from '@/utils/tokenStorage'

// 应用状态提供器
export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  // 获取用户状态
  const [token, setTokenState] = useState<string | null>(() => {
    // 同步获取初步的 token (Web 端立即生效)
    return localStorage.getItem('token')
  })

  // 初始化时获取 token (主要为了 Tauri 异步获取钥匙串中的 token)
  const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'

  useEffect(() => {
    if (isStatic) return
    tokenStorage.get().then(t => {
      if (t !== token) {
        setTokenState(t)
      }
    })
  }, [isStatic, token])

  const { user, loading: userLoading, error: userError, refetch: refetchUser } = useCurrentUser(isStatic ? null : token)
  const { login: authLogin, logout: authLogout } = useAuth()

  const { theme, toggle: toggleTheme } = useContext(ThemeContext) as { theme: 'light' | 'dark', toggle: () => void }

  const [sidebarOpen, setSidebarOpenState] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)

  // 计算派生状态
  const isAuthenticated = !!user
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
  const isLoading = userLoading

  // 监听用户错误
  useEffect(() => {
    if (userError) {
      setErrorState(userError.message)
    }
  }, [userError])

  // 状态对象
  const state: AppState = {
    currentUser: user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    theme,
    sidebarOpen,
  }

  // 操作对象
  const actions: AppActions = {
    // 用户操作
    login: async (identifier: string, password: string, remember = false) => {
      try {
        setErrorState(null)
        const result = await authLogin(identifier, password, remember)
        if (result && result.token) {
          // 1. 设置持久化存储 (Tauri/Web 兼容)
          await tokenStorage.set(result.token)

          // 2. 也是最重要的：同步更新本地 state 以触发 useCurrentUser 的响应式重新请求
          setTokenState(result.token)

          // 3. 立即重试获取用户信息 (Apollo 会因为 context 变化而重新执行 ME_QUERY)
          await refetchUser()
        }
        return result
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '登录失败'
        setErrorState(message)
        throw error
      }
    },

    logout: async () => {
      try {
        await authLogout()
        await tokenStorage.remove()
        setTokenState(null)
        setErrorState(null)
      } catch (error: unknown) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('登出错误:', error instanceof Error ? error.message : String(error))
        }
        // 即使登出失败也清理本地状态
        await tokenStorage.remove()
        setTokenState(null)
        window.location.href = '/login'
      }
    },

    refreshUser: () => {
      refetchUser()
    },

    // 主题操作
    toggleTheme,
    setTheme: () => {}, // No-op as it's controlled by ThemeContext toggle

    // UI操作
    toggleSidebar: () => {
      setSidebarOpenState(prev => !prev)
    },

    setSidebarOpen: (open: boolean) => {
      setSidebarOpenState(open)
    },

    // 错误处理
    setError: (newError: string | null) => {
      setErrorState(newError)
    },

    clearError: () => {
      setErrorState(null)
    },
  }

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  )
}

// 使用应用状态的hook
// eslint-disable-next-line react-refresh/only-export-components
export const useAppState = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}

// 便捷的状态和操作hooks (原本在 appStateHooks.ts)
// eslint-disable-next-line react-refresh/only-export-components
export const useAppUser = () => {
  const { state, actions } = useAppState()
  return {
    user: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    isAdmin: state.isAdmin,
    isLoading: state.isLoading,
    login: actions.login,
    logout: actions.logout,
    refreshUser: actions.refreshUser,
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppUI = () => {
  const { state, actions } = useAppState()
  return {
    sidebarOpen: state.sidebarOpen,
    toggleSidebar: actions.toggleSidebar,
    setSidebarOpen: actions.setSidebarOpen,
    isLoading: state.isLoading,
    error: state.error,
    setError: actions.setError,
    clearError: actions.clearError,
  }
}
