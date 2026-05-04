// src/components/StaticRoot.tsx
import { ConfigProvider, App as AntdApp } from 'antd'
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client'
import App from '../App'
import ThemeProvider, { useTheme } from './ThemeProvider'
import { AppStateProvider } from '@/hooks'
import { AntdThemeProvider } from '@/theme/antdTheme'

// 创建一个空的 Apollo Client，防止 Hook 报错
const emptyClient = new ApolloClient({
  link: new HttpLink({ uri: '/static-mock-api' }), // 提供一个 Mock URI 解决初始化报错
  cache: new InMemoryCache(),
})

// Simplified internal component for static mode (no Apollo)
function AppWithTheme () {
  const { isDarkMode } = useTheme()

  return (
    <AntdThemeProvider isDarkMode={isDarkMode}>
      <AppStateProvider>
        <AntdApp notification={{ placement: 'topRight', top: 50, duration: 4.5, maxCount: 3 }}>
          <App />
        </AntdApp>
      </AppStateProvider>
    </AntdThemeProvider>
  )
}

const StaticRoot = () => {
  return (
    <ApolloProvider client={emptyClient}>
      <ConfigProvider theme={{}}>
        <ThemeProvider>
          <AppWithTheme />
        </ThemeProvider>
      </ConfigProvider>
    </ApolloProvider>
  )
}

export default StaticRoot
