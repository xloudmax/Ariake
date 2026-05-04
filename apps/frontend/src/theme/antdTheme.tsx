import React from 'react'
import { ConfigProvider } from 'antd'
import { lightTheme, darkTheme } from './themeConfigs'

interface AntdThemeProviderProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
}

export const AntdThemeProvider: React.FC<AntdThemeProviderProps> = ({
  children,
  isDarkMode = false
}) => {
  return (
    <ConfigProvider
      theme={isDarkMode ? darkTheme : lightTheme}
      componentSize='middle'
    >
      {children}
    </ConfigProvider>
  )
}
