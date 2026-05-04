import { useState, useCallback, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { notification } from 'antd'
import { LIKE_POST_MUTATION, UNLIKE_POST_MUTATION, POST_QUERY } from '@/api/graphql/blog'
import { useAppUser } from './useAppState'
import type { PostQueryData } from '@/generated/graphql'

export interface UseLikeProps {
  postId: string;
  postSlug: string;
  initialIsLiked: boolean;
  initialLikeCount: number;
}

export const useLike = ({ postId, postSlug, initialIsLiked, initialLikeCount }: UseLikeProps) => {
  const { isAuthenticated } = useAppUser()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)

  // 当服务器数据更新时（如页面刷新），同步本地状态
  useEffect(() => {
    setIsLiked(initialIsLiked)
    setLikeCount(initialLikeCount)
  }, [initialIsLiked, initialLikeCount])

  const [likePost] = useMutation(LIKE_POST_MUTATION, {
    onError: (error) => {
      // 错误时回滚本地状态
      setIsLiked(initialIsLiked)
      setLikeCount(initialLikeCount)

      // 静默处理可预期的错误（如重复点赞）
      const errorMessage = error.message.toLowerCase()
      const isSilentError = errorMessage.includes('已经点赞') ||
                            errorMessage.includes('already liked')

      if (!isSilentError) {
        notification.error({
          message: '点赞失败',
          description: error.message,
          duration: 3,
        })
      }
    },
    onCompleted: (data) => {
      // 成功时同步最新数据
      if (data?.likePost) {
        setIsLiked(true)
        setLikeCount(data.likePost.stats?.likeCount || likeCount + 1)
      }
    },
    // 更新缓存
    update: (cache, { data }) => {
      // 只在成功时更新缓存
      if (!data?.likePost) return

      try {
        // 更新 POST_QUERY 缓存
        const existingPost = cache.readQuery<PostQueryData>({
          query: POST_QUERY,
          variables: { slug: postSlug },
        })

        if (existingPost?.post) {
          cache.writeQuery<PostQueryData>({
            query: POST_QUERY,
            variables: { slug: postSlug },
            data: {
              post: {
                ...existingPost.post,
                stats: {
                  ...existingPost.post.stats,
                  likeCount: data.likePost.stats?.likeCount ?? (initialLikeCount + 1),
                },
                isLiked: true,
              },
            },
          })
        }
      } catch {
        // 缓存更新失败时静默处理，避免影响用户体验
      }
    },
  })

  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION, {
    onError: (error) => {
      // 错误时回滚本地状态
      setIsLiked(initialIsLiked)
      setLikeCount(initialLikeCount)

      // 静默处理可预期的错误（如重复取消点赞）
      const errorMessage = error.message.toLowerCase()
      const isSilentError = errorMessage.includes('尚未点赞') ||
                            errorMessage.includes('not liked')

      if (!isSilentError) {
        notification.error({
          message: '取消点赞失败',
          description: error.message,
          duration: 3,
        })
      }
    },
    onCompleted: (data) => {
      // 成功时同步最新数据
      if (data?.unlikePost) {
        setIsLiked(false)
        setLikeCount(data.unlikePost.stats?.likeCount || Math.max(0, likeCount - 1))
      }
    },
    // 更新缓存
    update: (cache, { data }) => {
      // 只在成功时更新缓存
      if (!data?.unlikePost) return

      try {
        // 更新 POST_QUERY 缓存
        const existingPost = cache.readQuery<PostQueryData>({
          query: POST_QUERY,
          variables: { slug: postSlug },
        })

        if (existingPost?.post) {
          cache.writeQuery<PostQueryData>({
            query: POST_QUERY,
            variables: { slug: postSlug },
            data: {
              post: {
                ...existingPost.post,
                stats: {
                  ...existingPost.post.stats,
                  likeCount: data.unlikePost.stats?.likeCount ?? Math.max(0, initialLikeCount - 1),
                },
                isLiked: false,
              },
            },
          })
        }
      } catch {
        // 缓存更新失败时静默处理，避免影响用户体验
      }
    },
  })

  const handleLike = useCallback(async () => {
    if (!isAuthenticated) {
      notification.warning({
        message: '提示',
        description: '请先登录',
        duration: 3,
      })
      return
    }

    try {
      if (isLiked) {
        // 发送取消点赞请求
        await unlikePost({
          variables: { id: postId },
        })
      } else {
        // 发送点赞请求
        await likePost({
          variables: { id: postId },
        })
      }
    } catch {
      // 错误处理已经在 mutation 的 onError 中处理
    }
  }, [isAuthenticated, isLiked, postId, likePost, unlikePost])

  return {
    isLiked,
    likeCount,
    handleLike,
  }
}
