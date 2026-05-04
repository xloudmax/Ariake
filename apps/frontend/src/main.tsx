// src/main.tsx
// 应用启动文件，挂载 React 应用并提供GraphQL客户端、主题配置和应用状态管理
import '@ant-design/v5-patch-for-react-19'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './components/Root'
import './styles/modern-blog.css'
import './index.css'

// Tauri 桌面端优化：禁用全局右键菜单（输入框除外）
if (window.__TAURI_INTERNALS__) {
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement
    // 允许在输入框和文本域中使用右键菜单（如复制/粘贴）
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }
    // 开发模式下保留右键审查元素功能（可根据需要注释掉）
    if (process.env.NODE_ENV !== 'development') {
      e.preventDefault()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
