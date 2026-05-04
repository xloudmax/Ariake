// src/utils/config.ts
import { isIOS, isTauri } from './platform'

/**
 * 获取 API 基础 URL
 * 在 iOS (Tauri) 下特殊配置 Tailscale 转发地址
 * 在 桌面端 (Tauri) 下使用 localhost
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  const isWebDev = import.meta.env.DEV && !isTauri

  if (isWebDev) {
    if (!envUrl || envUrl === 'http://localhost:11451') {
      return ''
    }
    return envUrl
  }

  // If env var is set, use it (unless it's the hardcoded Tailscale IP and we're not on iOS)
  if (envUrl && envUrl !== 'http://100.64.250.28:11451') {
    return envUrl
  }

  if (isTauri) {
    if (isIOS) {
      // Default Tailscale IP for iOS testing if no other URL is provided
      return envUrl || 'http://100.64.250.28:11451'
    } else {
      // Desktop Tauri
      return 'http://localhost:11451'
    }
  }

  // Default fallback
  return envUrl || 'http://localhost:11451'
}
