// src/context/ThemeContext.ts
import { createContext } from 'react'

export type Theme = 'light' | 'dark'
export type ThemeMode = 'system' | Theme

export interface Ctx {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

// 创建 Context，并提供符合 Ctx 接口的默认值
export const ThemeContext = createContext<Ctx>({
  theme: 'light', // 默认主题
  mode: 'system',
  setMode: () => {},
  toggle: () => {}, // 空函数作为默认的 toggle 实现
})
