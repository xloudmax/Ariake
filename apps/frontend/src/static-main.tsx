// src/static-main.tsx
import '@ant-design/v5-patch-for-react-19'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import StaticRoot from './components/StaticRoot'
import './styles/modern-blog.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StaticRoot />
  </React.StrictMode>
)
