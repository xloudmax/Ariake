// src/utils/offlineStorage.ts
// 离线存储工具类 - 使用IndexedDB替代localStorage

// 数据库配置
const DB_NAME = 'BlogEditorDB'
const DB_VERSION = 1
const STORE_NAME = 'offlinePosts'

// 存储配额配置（字节）
const DEFAULT_QUOTA = 50 * 1024 * 1024 // 50MB默认配额

// 离线文章数据结构
export interface OfflinePost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  categories: string[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  syncStatus?: 'pending' | 'syncing' | 'success' | 'failed';
  // 增量同步相关字段
  version?: number; // 版本号
  changes?: Partial<OfflinePost>; // 变更内容
  // 压缩相关字段
  isCompressed?: boolean; // 是否已压缩
}

// 冲突解决策略
export type ConflictResolutionStrategy = 'serverWins' | 'clientWins' | 'merge' | 'manual'

// 存储配额信息
interface StorageQuota {
  maxBytes: number; // 最大字节数
  usedBytes: number; // 已使用字节数
  postCount: number; // 文章数量
}

// 简单的压缩/解压缩函数
const compress = (str: string): string => {
  // 这里使用简单的压缩算法，实际项目中可以使用更高效的压缩库
  return str.replace(/\s+/g, ' ').trim()
}

const decompress = (str: string): string => {
  return str
}

// 数据库操作类
class IndexedDBStorage {
  private db: IDBDatabase | null = null
  private isInitialized = false

  // 初始化数据库
  async init (): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
          store.createIndex('lastSyncedAt', 'lastSyncedAt', { unique: false })
          store.createIndex('syncStatus', 'syncStatus', { unique: false })
          store.createIndex('version', 'version', { unique: false })
          store.createIndex('isCompressed', 'isCompressed', { unique: false })
        }
      }
    })
  }

  // 获取数据库实例
  private async getDB (): Promise<IDBDatabase> {
    if (!this.isInitialized) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  // 保存文章到IndexedDB（支持压缩）
  async savePost (post: Omit<OfflinePost, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isCompressed'>, shouldCompress: boolean = true): Promise<string> {
    // 检查存储配额
    const quota = await this.getStorageInfo()
    if (quota.usedBytes >= DEFAULT_QUOTA) {
      // 如果超过配额，执行清理
      await this.cleanupOldPosts()
      // 再次检查配额
      const newQuota = await this.getStorageInfo()
      if (newQuota.usedBytes >= DEFAULT_QUOTA) {
        throw new Error('存储空间已满，请清理一些离线文章')
      }
    }

    const db = await this.getDB()
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // 压缩内容（如果需要）
    let content = post.content
    let isCompressed = false
    if (shouldCompress && post.content.length > 1000) {
      content = compress(post.content)
      isCompressed = true
    }

    const offlinePost: OfflinePost = {
      id,
      title: post.title,
      content,
      tags: post.tags,
      categories: post.categories,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      version: 1, // 初始版本号
      isCompressed
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(offlinePost)

      request.onsuccess = () => {
        resolve(id)
      }

      request.onerror = () => {
        reject(new Error('Failed to save post to IndexedDB'))
      }
    })
  }

  // 更新IndexedDB中的文章（支持增量同步和压缩）
  async updatePost (id: string, updates: Partial<Omit<OfflinePost, 'id' | 'createdAt' | 'version' | 'isCompressed'>>, isIncremental: boolean = false, shouldCompress: boolean = true): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const existingPost = getRequest.result
        if (!existingPost) {
          reject(new Error('Post not found'))
          return
        }

        // 处理内容压缩
        let content = updates.content
        let isCompressed = existingPost.isCompressed
        if (content && shouldCompress && content.length > 1000) {
          content = compress(content)
          isCompressed = true
        }

        const finalUpdates = content ? { ...updates, content } : updates

        let updatedPost: OfflinePost
        if (isIncremental) {
          // 增量更新 - 记录变更内容
          updatedPost = {
            ...existingPost,
            ...finalUpdates,
            updatedAt: new Date().toISOString(),
            version: (existingPost.version || 1) + 1,
            changes: finalUpdates, // 记录变更内容
            isCompressed
          }
        } else {
          // 完整更新
          updatedPost = {
            ...existingPost,
            ...finalUpdates,
            updatedAt: new Date().toISOString(),
            version: (existingPost.version || 1) + 1,
            isCompressed
          }
        }

        const putRequest = store.put(updatedPost)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(new Error('Failed to update post'))
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get post'))
      }
    })
  }

  // 获取IndexedDB中的文章（自动解压）
  async getPost (id: string): Promise<OfflinePost | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const post = request.result || null
        if (post && post.isCompressed) {
          // 解压内容
          post.content = decompress(post.content)
          post.isCompressed = false
        }
        resolve(post)
      }

      request.onerror = () => {
        reject(new Error('Failed to get post'))
      }
    })
  }

  // 获取所有IndexedDB中的文章（自动解压）
  async getAllPosts (): Promise<OfflinePost[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const posts = request.result || []
        // 解压所有压缩的文章
        const decompressedPosts = posts.map(post => {
          if (post.isCompressed) {
            post.content = decompress(post.content)
            post.isCompressed = false
          }
          return post
        })
        // 按更新时间排序，最新的在前面
        decompressedPosts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        resolve(decompressedPosts)
      }

      request.onerror = () => {
        reject(new Error('Failed to get all posts'))
      }
    })
  }

  // 删除IndexedDB中的文章
  async deletePost (id: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete post'))
      }
    })
  }

  // 标记文章已同步
  async markPostAsSynced (id: string, syncTime: string = new Date().toISOString()): Promise<void> {
    await this.updatePost(id, {
      lastSyncedAt: syncTime,
      syncStatus: 'success'
    })
  }

  // 检查是否有未同步的文章
  async hasUnsyncedPosts (): Promise<boolean> {
    const posts = await this.getAllPosts()
    return posts.some(post => !post.lastSyncedAt)
  }

  // 清理已同步的旧文章（保留最近30天的）
  async cleanupSyncedPosts (daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const posts = await this.getAllPosts()

    for (const post of posts) {
      // 如果文章已同步且同步时间早于截止日期，则删除
      if (post.lastSyncedAt && new Date(post.lastSyncedAt) < cutoffDate) {
        await this.deletePost(post.id)
      }
    }
  }

  // 清理旧文章以释放空间（智能缓存清理）
  async cleanupOldPosts (): Promise<void> {
    // 优先删除最旧的已同步文章
    const posts = await this.getAllPosts()
    const syncedPosts = posts
      .filter(post => post.lastSyncedAt)
      .sort((a, b) => new Date(a.lastSyncedAt!).getTime() - new Date(b.lastSyncedAt!).getTime())

    // 删除一半的已同步文章
    const countToDelete = Math.floor(syncedPosts.length / 2)
    for (let i = 0; i < countToDelete; i++) {
      await this.deletePost(syncedPosts[i].id)
    }

    // 如果仍然超过配额，继续删除未同步文章中最旧的
    if ((await this.getStorageInfo()).usedBytes >= DEFAULT_QUOTA) {
      const unsyncedPosts = posts
        .filter(post => !post.lastSyncedAt)
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())

      for (const post of unsyncedPosts) {
        await this.deletePost(post.id)
        // 检查是否已低于配额
        if ((await this.getStorageInfo()).usedBytes < DEFAULT_QUOTA) {
          break
        }
      }
    }
  }

  // 获取存储使用情况
  async getStorageInfo (): Promise<StorageQuota> {
    const posts = await this.getAllPosts()
    const postCount = posts.length
    // 简单估算大小（字符数）
    const usedBytes = posts.reduce((total, post) =>
      total + new Blob([JSON.stringify(post)]).size, 0)
    return { maxBytes: DEFAULT_QUOTA, usedBytes, postCount }
  }

  // 获取需要同步的变更
  async getPendingChanges (): Promise<OfflinePost[]> {
    const posts = await this.getAllPosts()
    return posts.filter(post =>
      !post.lastSyncedAt ||
      (post.lastSyncedAt && new Date(post.lastSyncedAt) < new Date(post.updatedAt))
    )
  }

  // 解决同步冲突
  async resolveConflict (postId: string, serverPost: Partial<OfflinePost>, strategy: ConflictResolutionStrategy): Promise<void> {
    const localPost = await this.getPost(postId)
    if (!localPost) {
      throw new Error('Local post not found')
    }

    let resolvedPost: OfflinePost

    switch (strategy) {
      case 'serverWins':
        // 服务器版本优先
        resolvedPost = {
          ...localPost,
          ...serverPost,
          updatedAt: new Date().toISOString(),
          version: Math.max(localPost.version || 1, serverPost.version || 1) + 1
        }
        break

      case 'clientWins':
        // 客户端版本优先
        resolvedPost = {
          ...localPost,
          updatedAt: new Date().toISOString(),
          version: Math.max(localPost.version || 1, serverPost.version || 1) + 1
        }
        break

      case 'merge':
        // 合并版本（简单合并策略）
        resolvedPost = {
          ...localPost,
          ...serverPost,
          title: serverPost.title || localPost.title,
          content: serverPost.content || localPost.content,
          tags: [...new Set([...(localPost.tags || []), ...(serverPost.tags || [])])],
          categories: [...new Set([...(localPost.categories || []), ...(serverPost.categories || [])])],
          updatedAt: new Date().toISOString(),
          version: Math.max(localPost.version || 1, serverPost.version || 1) + 1
        }
        break

      case 'manual':
      default:
        // 手动解决 - 标记为冲突状态
        resolvedPost = {
          ...localPost,
          syncStatus: 'failed',
          updatedAt: new Date().toISOString(),
          version: Math.max(localPost.version || 1, serverPost.version || 1) + 1
        }
        break
    }

    // 保存解决后的文章
    await this.updatePost(postId, resolvedPost)
  }

  // 压缩所有未压缩的文章
  async compressAllPosts (): Promise<void> {
    const posts = await this.getAllPosts()
    for (const post of posts) {
      if (!post.isCompressed && post.content.length > 1000) {
        await this.updatePost(post.id, { content: post.content }, false, true)
      }
    }
  }
}

// 创建单例实例
const indexedDBStorage = new IndexedDBStorage()

// 保持与原API兼容的导出
export const saveOfflinePost = (post: Omit<OfflinePost, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isCompressed'>, shouldCompress?: boolean): Promise<string> => {
  return indexedDBStorage.savePost(post, shouldCompress)
}

export const updateOfflinePost = (id: string, updates: Partial<Omit<OfflinePost, 'id' | 'createdAt' | 'version' | 'isCompressed'>>, isIncremental: boolean = false, shouldCompress?: boolean): Promise<void> => {
  return indexedDBStorage.updatePost(id, updates, isIncremental, shouldCompress)
}

export const getOfflinePost = (id: string): Promise<OfflinePost | null> => {
  return indexedDBStorage.getPost(id)
}

export const getAllOfflinePosts = (): Promise<OfflinePost[]> => {
  return indexedDBStorage.getAllPosts()
}

export const deleteOfflinePost = (id: string): Promise<void> => {
  return indexedDBStorage.deletePost(id)
}

export const markPostAsSynced = (id: string, syncTime?: string): Promise<void> => {
  return indexedDBStorage.markPostAsSynced(id, syncTime)
}

export const hasUnsyncedPosts = (): Promise<boolean> => {
  return indexedDBStorage.hasUnsyncedPosts()
}

export const cleanupSyncedPosts = (daysToKeep?: number): Promise<void> => {
  return indexedDBStorage.cleanupSyncedPosts(daysToKeep)
}

// 新增API
export const getStorageInfo = (): Promise<{ maxBytes: number; usedBytes: number; postCount: number }> => {
  return indexedDBStorage.getStorageInfo()
}

export const getPendingChanges = (): Promise<OfflinePost[]> => {
  return indexedDBStorage.getPendingChanges()
}

export const resolveConflict = (postId: string, serverPost: Partial<OfflinePost>, strategy: ConflictResolutionStrategy): Promise<void> => {
  return indexedDBStorage.resolveConflict(postId, serverPost, strategy)
}

export const compressAllPosts = (): Promise<void> => {
  return indexedDBStorage.compressAllPosts()
}

export default {
  saveOfflinePost,
  updateOfflinePost,
  getOfflinePost,
  getAllOfflinePosts,
  deleteOfflinePost,
  markPostAsSynced,
  hasUnsyncedPosts,
  cleanupSyncedPosts,
  getStorageInfo,
  getPendingChanges,
  resolveConflict,
  compressAllPosts
}
