// src/components/TauriTitleBar.tsx
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

export default function TauriTitleBar () {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    // 简单的检测是否为 macOS (用于给红绿灯留出空间)
    if (navigator.userAgent.includes('Mac')) {
      setIsMac(true)
    }
  }, [])

  if (!isTauri) return null

  return (
    <div
      data-tauri-drag-region
      className={`fixed top-0 left-0 right-0 z-[9999] h-8 transition-colors duration-300 ${
        isMac ? 'ml-20' : '' // 给 macOS 顶部的红绿灯留出宽度
      }`}
      style={{
        // 让鼠标可以在这个区域拖拽窗口，同时不阻挡底下的点击事件（如果有的话）
        WebkitAppRegion: 'drag',
        // 背景完全透明，不影响现有的设计
        backgroundColor: 'transparent',
      } as React.CSSProperties}
    />
  )
}
