// src/utils/tokenStorage.ts
import { invoke } from '@tauri-apps/api/core'

const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

// TODO:
// - [x] Debug Tauri Keychain Hang <!-- id: 89 -->
//   - [x] Analyze `tokenStorage.ts` and `lib.rs` <!-- id: 90 -->
//   - [x] Make keychain operations non-blocking in `tokenStorage.ts` <!-- id: 91 -->
//   - [x] Add timeout for keychain access on startup <!-- id: 92 -->
// - [x] Optimize GitHub Pages Deployment Performance <!-- id: 93 -->
//   - [x] Identify $O(N)$ API call bottleneck in `deploy.go` <!-- id: 94 -->
//   - [x] Implement incremental upload logic (SHA comparison) <!-- id: 95 -->
//   - [x] Verify performance improvement <!-- id: 96 -->
export const tokenStorage = {
  async get (): Promise<string | null> {
    if (isTauri) {
      try {
        // 创建一个带超时的 Promise，避免钥匙串访问卡死导致应用初始化卡死
        const keychainPromise = invoke<string | null>('get_token')
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => {
            // eslint-disable-next-line no-console
            console.warn('Tauri keychain get_token timed out after 30s, falling back to localStorage')
            resolve(null)
          }, 30000)
        )

        const token = await Promise.race([keychainPromise, timeoutPromise])
        if (token) return token
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to get token from keychain', e)
      }
      // 备选方案：从 localStorage 获取
      return localStorage.getItem('token')
    }
    return localStorage.getItem('token')
  },

  async set (token: string): Promise<void> {
    // 立即更新 localStorage，确保 UI 能立刻响应
    localStorage.setItem('token', token)

    if (isTauri) {
      // 异步调用钥匙串存储，不等待其完成以避免阻塞 UI 跳转
      // 如果钥匙串弹出系统授权弹窗，也不会影响当前页面的跳转逻辑
      invoke('store_token', { token }).catch(e => {
        // eslint-disable-next-line no-console
        console.error('Failed to store token in keychain (background)', e)
      })
    }
  },

  async remove (): Promise<void> {
    localStorage.removeItem('token')
    if (isTauri) {
      // 同理，登出也不应该被钥匙串操作阻塞
      invoke('delete_token').catch(e => {
        // eslint-disable-next-line no-console
        console.error('Failed to delete token from keychain (background)', e)
      })
    }
  }
}
