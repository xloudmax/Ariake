// src/utils/platform.ts

/**
 * 是否是 Tauri 环境
 */
export const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

/**
 * 是否是 iOS 环境 (通过 User Agent 检测)
 */
export const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)

/**
 * 是否是静态导出模式
 */
export const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'
