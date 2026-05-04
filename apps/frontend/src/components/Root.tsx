// src/components/Root.tsx
import React, { useEffect } from 'react'
import { ApolloProvider } from '@apollo/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import App from '../App'
import ThemeProvider, { useTheme } from './ThemeProvider'
import { AppStateProvider } from '@/hooks'
import { AntdThemeProvider } from '@/theme/antdTheme'
import client from '../graphql/client'
import { setErrorHandlerConfig } from '@/services/errorHandler'

// 将 Ant Design App 上下文中的 notification 实例注入错误处理器，避免静态调用警告
const ErrorHandlerConfigurator: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { notification } = AntdApp.useApp()

  useEffect(() => {
    setErrorHandlerConfig({ notificationApi: notification })
  }, [notification])

  return <>{children}</>
}

// 内部组件，用于访问主题上下文
function AppWithTheme () {
  const { isDarkMode } = useTheme()

  return (
    <AntdThemeProvider isDarkMode={isDarkMode}>
      <ApolloProvider client={client}>
        <AppStateProvider>
          <AntdApp notification={{ placement: 'topRight', top: 50, duration: 4.5, maxCount: 3 }}>
            <ErrorHandlerConfigurator>
              <App />
            </ErrorHandlerConfigurator>
          </AntdApp>
        </AppStateProvider>
      </ApolloProvider>
    </AntdThemeProvider>
  )
}

const Root = () => {
  return (
    <ConfigProvider
      theme={{
        // 自定义主题配置，确保与React 19兼容
      }}
    >
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </ConfigProvider>
  )
}

export default Root
