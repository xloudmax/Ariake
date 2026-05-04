// src/theme/themeConfigs.ts
// 主题配置常量，用于Ant Design主题配置

import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

// 亮色主题配置
export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: 'var(--color-primary)',
    colorSuccess: 'var(--color-success-light, #10b981)',
    colorWarning: 'var(--color-warning-light, #f59e0b)',
    colorError: 'var(--color-error-light, #ef4444)',
    colorInfo: 'var(--color-info-light, #3b82f6)',
    colorBgBase: 'var(--surface-base)',
    colorBgContainer: 'var(--surface-container)',
    colorBgElevated: 'var(--surface-elevated)',
    colorBgLayout: 'var(--surface-base)',
    colorText: 'var(--surface-text)',
    colorTextSecondary: 'var(--surface-text-secondary)',
    colorTextTertiary: 'var(--surface-text-tertiary)',
    colorBorder: 'var(--surface-border)',
    colorBorderSecondary: 'var(--surface-border)',

    fontFamily: '"Noto Sans SC", "Hack Nerd Mono", sans-serif',
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    boxShadow: 'var(--shadow)',
    boxShadowSecondary: 'var(--shadow-lg)',
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    },
    Modal: {
      borderRadius: 12,
    },
    Drawer: {
      borderRadius: 0,
    },
    Menu: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 8,
    },
    Tag: {
      borderRadius: 6,
      defaultBg: 'rgba(255, 255, 255, 0.92)',
      defaultColor: 'var(--surface-text)',
    },
  },
}

// 深色主题配置
export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: 'var(--color-primary)',
    colorSuccess: 'var(--color-success-dark, #10b981)',
    colorWarning: 'var(--color-warning-dark, #f59e0b)',
    colorError: 'var(--color-error-dark, #ef4444)',
    colorInfo: 'var(--color-info-dark, #3b82f6)',
    colorBgBase: 'var(--surface-base)',
    colorBgContainer: 'var(--surface-container)',
    colorBgElevated: 'var(--surface-elevated)',
    colorBgLayout: 'var(--surface-base)',
    colorText: 'var(--surface-text)',
    colorTextSecondary: 'var(--surface-text-secondary)',
    colorTextTertiary: 'var(--surface-text-tertiary)',
    colorBorder: 'var(--surface-border)',
    colorBorderSecondary: 'var(--surface-border)',
    fontFamily: '"Noto Sans SC", "Hack Nerd Mono", sans-serif',
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    boxShadow: 'var(--shadow)',
    boxShadowSecondary: 'var(--shadow-lg)',
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
    },
    Modal: {
      borderRadius: 12,
    },
    Drawer: {
      borderRadius: 0,
    },
    Menu: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 8,
    },
    Tag: {
      borderRadius: 6,
      defaultBg: 'rgba(15, 23, 42, 0.76)',
      defaultColor: 'var(--surface-text)',
    },
  },
}
