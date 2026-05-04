import { useLazyQuery, ApolloCache, NormalizedCacheObject, gql, useQuery } from '@apollo/client'
import type {
  CreatePostInput,
  UpdatePostInput,
  PostFilterInput,
  PostSortInput,
} from '@/generated/graphql'
import type {
  BlogPost as TypedBlogPost,
  BlogPostVersion,
  SearchResults
} from '@/types'

// Import generated operations and hooks
import {
  usePostsQuery,

  usePopularPostsQuery,
  useRecentPostsQuery,
  useTrendingTagsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  usePublishPostMutation,
  useArchivePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  PostsDocument,
  PostDocument,
  SearchPostsDocument,
  PopularPostsDocument,
  RecentPostsDocument,
  TrendingTagsDocument,
  CreatePostDocument,
  UpdatePostDocument,
  DeletePostDocument,
  PublishPostDocument,
  ArchivePostDocument,
  LikePostDocument,
  UnlikePostDocument
} from '@/generated/graphql'

// ==================== EXPORT GENERATED OPERATIONS ====================

// Export the generated documents for backward compatibility
export const POSTS_QUERY = PostsDocument
export const POST_QUERY = PostDocument
export const SEARCH_POSTS_QUERY = SearchPostsDocument
export const POPULAR_POSTS_QUERY = PopularPostsDocument
export const RECENT_POSTS_QUERY = RecentPostsDocument
export const TRENDING_TAGS_QUERY = TrendingTagsDocument

export const CREATE_POST_MUTATION = CreatePostDocument
export const UPDATE_POST_MUTATION = UpdatePostDocument
export const DELETE_POST_MUTATION = DeletePostDocument
export const PUBLISH_POST_MUTATION = PublishPostDocument
export const ARCHIVE_POST_MUTATION = ArchivePostDocument
export const LIKE_POST_MUTATION = LikePostDocument
export const UNLIKE_POST_MUTATION = UnlikePostDocument

// ==================== CUSTOM HOOKS ====================

// 博客文章列表 Hook
export const usePosts = (filter?: PostFilterInput, sort?: PostSortInput, limit: number = 10, offset: number = 0) => {
  const { data, loading, error, fetchMore, refetch } = usePostsQuery({
    variables: { limit, offset, filter, sort },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const loadMore = () => {
    return fetchMore({
      variables: {
        offset: data?.posts?.length || 0,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          posts: [...(prev.posts || []), ...(fetchMoreResult.posts || [])],
        }
      },
    })
  }

  return {
    posts: data?.posts as TypedBlogPost[] || [],
    loading,
    error,
    loadMore,
    refetch,
  }
}

// 搜索文章 Hook
export const useSearchPosts = () => {
  const [searchPosts, { data, loading, error }] = useLazyQuery(SEARCH_POSTS_QUERY, {
    errorPolicy: 'all',
  })

  const search = (query: string, limit?: number, offset?: number) => {
    return searchPosts({
      variables: { query, limit, offset },
    })
  }

  return {
    search,
    results: data?.searchPosts as SearchResults || null,
    loading,
    error,
  }
}

// 热门文章 Hook
export const usePopularPosts = (limit: number = 10) => {
  const { data, loading, error } = usePopularPostsQuery({
    variables: { limit },
    errorPolicy: 'all',
  })

  return {
    posts: data?.getPopularPosts as TypedBlogPost[] || [],
    loading,
    error,
  }
}

// 最新文章 Hook
export const useRecentPosts = (limit: number = 10) => {
  const { data, loading, error } = useRecentPostsQuery({
    variables: { limit },
    errorPolicy: 'all',
  })

  return {
    posts: data?.getRecentPosts as TypedBlogPost[] || [],
    loading,
    error,
  }
}

// 热门标签 Hook
export const useTrendingTags = (limit: number = 20) => {
  const { data, loading, error } = useTrendingTagsQuery({
    variables: { limit },
    errorPolicy: 'all',
  })

  return {
    tags: data?.getTrendingTags as string[] || [],
    loading,
    error,
  }
}

// 博客操作 Hook
export const useBlogActions = () => {
  // 创建文章
  const [createPostMutation, { loading: createLoading, error: createError }] = useCreatePostMutation({
    refetchQueries: [{ query: POSTS_QUERY }],
    awaitRefetchQueries: true,
  })

  // 更新文章
  const [updatePostMutation, { loading: updateLoading, error: updateError }] = useUpdatePostMutation()

  // 删除文章
  const [deletePostMutation, { loading: deleteLoading, error: deleteError }] = useDeletePostMutation({
    refetchQueries: [{ query: POSTS_QUERY }],
    awaitRefetchQueries: true,
  })

  // 发布文章
  const [publishPostMutation, { loading: publishLoading }] = usePublishPostMutation()

  // 归档文章
  const [archivePostMutation, { loading: archiveLoading }] = useArchivePostMutation()

  // 点赞文章
  const [likePostMutation, { loading: likeLoading }] = useLikePostMutation()

  // 取消点赞
  const [unlikePostMutation, { loading: unlikeLoading }] = useUnlikePostMutation()

  const createPost = async (postData: CreatePostInput) => {
    const result = await createPostMutation({
      variables: { input: postData },
    })
    return result.data?.createPost as TypedBlogPost
  }

  const updatePost = async (id: string, postData: UpdatePostInput) => {
    const result = await updatePostMutation({
      variables: { id, input: postData },
      update: (cache: ApolloCache<NormalizedCacheObject>, { data }) => {
        if (data?.updatePost) {
          cache.writeQuery({
            query: POST_QUERY,
            variables: { id },
            data: { post: data.updatePost },
          })
        }
      },
    })
    return result.data?.updatePost as TypedBlogPost
  }

  const deletePost = async (id: string) => {
    const result = await deletePostMutation({
      variables: { id },
      update: (cache: ApolloCache<NormalizedCacheObject>) => {
        cache.evict({ id: cache.identify({ __typename: 'BlogPost', id }) })
        cache.gc()
      },
    })
    return result.data?.deletePost
  }

  const publishPost = async (id: string) => {
    const result = await publishPostMutation({
      variables: { id },
      update: (cache: ApolloCache<NormalizedCacheObject>, { data }) => {
        if (data?.publishPost) {
          cache.modify({
            id: cache.identify({ __typename: 'BlogPost', id }),
            fields: {
              status: () => data.publishPost.status,
              publishedAt: () => data.publishPost.publishedAt,
            },
          })
        }
      },
    })
    return result.data?.publishPost as TypedBlogPost
  }

  const archivePost = async (id: string) => {
    const result = await archivePostMutation({
      variables: { id },
      update: (cache: ApolloCache<NormalizedCacheObject>, { data }) => {
        if (data?.archivePost) {
          cache.modify({
            id: cache.identify({ __typename: 'BlogPost', id }),
            fields: {
              status: () => data.archivePost.status,
            },
          })
        }
      },
    })
    return result.data?.archivePost as TypedBlogPost
  }

  const likePost = async (id: string) => {
    const result = await likePostMutation({
      variables: { id },
      // 简化optimisticResponse，只更新必要字段
      optimisticResponse: undefined,
    })
    return result.data?.likePost as TypedBlogPost
  }

  const unlikePost = async (id: string) => {
    const result = await unlikePostMutation({
      variables: { id },
      // 简化optimisticResponse，只更新必要字段
      optimisticResponse: undefined,
    })
    return result.data?.unlikePost as TypedBlogPost
  }

  return {
    // API 函数
    createPost,
    updatePost,
    deletePost,
    publishPost,
    archivePost,
    likePost,
    unlikePost,

    // 加载状态
    loading: {
      create: createLoading,
      update: updateLoading,
      delete: deleteLoading,
      publish: publishLoading,
      archive: archiveLoading,
      like: likeLoading,
      unlike: unlikeLoading,
    },

    // 错误状态
    errors: {
      create: createError,
      update: updateError,
      delete: deleteError,
    },
  }
}

// ==================== 文章版本历史 ====================

// 文章版本历史查询
export const POST_VERSIONS_QUERY = gql`
  query PostVersions($postId: ID!) {
    postVersions(postId: $postId) {
      id
      versionNum
      title
      content
      changeLog
      createdAt
      createdBy {
        id
        username
        avatar
        email
      }
    }
  }
`

// 文章版本历史 Hook
export const usePostVersions = (postId: string, skip: boolean = false) => {
  const { data, loading, error, refetch } = useQuery(POST_VERSIONS_QUERY, {
    variables: { postId },
    errorPolicy: 'all',
    skip, // 允许延迟加载
  })

  return {
    versions: data?.postVersions as BlogPostVersion[] || [],
    loading,
    error,
    refetch,
  }
}

// 懒加载版本历史 Hook（按需加载）
export const useLazyPostVersions = () => {
  const [getPostVersions, { data, loading, error }] = useLazyQuery(POST_VERSIONS_QUERY, {
    errorPolicy: 'all',
  })

  const fetchVersions = (postId: string) => {
    return getPostVersions({
      variables: { postId },
    })
  }

  return {
    fetchVersions,
    versions: data?.postVersions as BlogPostVersion[] || [],
    loading,
    error,
  }
}
