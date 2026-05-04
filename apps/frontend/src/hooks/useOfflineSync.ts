import { useEffect } from 'react'
import { notification } from 'antd'
import { useAppUser } from './useAppState'
import { useBlogActions } from '../api/graphql/blog'
import offlineStorage from '@/utils/offlineStorage'

export function useOfflineSync (options: { skip?: boolean } = {}) {
  const { isAuthenticated } = useAppUser()
  const { createPost } = useBlogActions()

  useEffect(() => {
    if (options.skip) return

    const syncOfflinePosts = async () => {
      if (!isAuthenticated || !navigator.onLine) return

      try {
        const posts = await offlineStorage.getAllOfflinePosts()
        const unsyncedPosts = posts.filter(post => !post.lastSyncedAt)

        if (unsyncedPosts.length > 0) {
          notification.info({
            message: '提示',
            description: `发现${unsyncedPosts.length}篇离线文章，正在同步...`,
            duration: 5,
          })

          let successCount = 0
          let failCount = 0

          for (const post of unsyncedPosts) {
            try {
              // 调用API同步文章
              await createPost({
                title: post.title,
                content: post.content,
                tags: post.tags || [],
                categories: post.categories || [],
              })

              // 标记为已同步
              await offlineStorage.markPostAsSynced(post.id)
              successCount++
            } catch {
              failCount++
            }
          }

          if (successCount > 0) {
            notification.success({
              message: '同步成功',
              description: `成功同步${successCount}篇离线文章`,
              duration: 5,
            })
          }

          if (failCount > 0) {
            notification.error({
              message: '同步失败',
              description: `${failCount}篇文章同步失败，请检查网络连接后重试`,
              duration: 5,
            })
          }
        }
      } catch {
        // console.error('Offline sync failed:', error);
        // 静默失败，不打扰用户，除非是严重的逻辑错误
      }
    }

    // 当用户登录且在线时，检查并同步离线文章
    if (isAuthenticated && navigator.onLine) {
      // 延迟1秒执行同步，避免在页面加载时立即执行
      const timer = setTimeout(syncOfflinePosts, 1000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, createPost, options.skip])
}
