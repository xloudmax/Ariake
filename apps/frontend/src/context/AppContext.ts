import { createContext } from 'react'
import { User } from '@/generated/graphql'

// 应用状态接口
export interface AppState {
  // 用户状态
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  // 应用状态
  isLoading: boolean;
  error: string | null;

  // 主题状态
  theme: 'light' | 'dark';

  // 侧边栏状态
  sidebarOpen: boolean;
}

// 应用状态操作接口
export interface AppActions {
  // 用户操作
  login: (identifier: string, password: string, remember?: boolean) => Promise<unknown>;
  logout: () => Promise<void>;
  refreshUser: () => void;

  // 主题操作
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // UI操作
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;
}

// 应用上下文
export const AppContext = createContext<{
  state: AppState;
  actions: AppActions;
} | null>(null)
