import { gql, useQuery, useMutation } from '@apollo/client'
import type { BlogPostComment } from '@/types'
import type {
  CreateCommentInput,
  UpdateCommentInput
} from '@/generated/graphql'

// ==================== QUERIES ====================

// 获取文章评论列表
export const COMMENTS_QUERY = gql`
  query Comments($blogPostId: ID!, $limit: Int, $offset: Int, $filter: CommentFilterInput, $sort: CommentSortInput) {
    comments(blogPostId: $blogPostId, limit: $limit, offset: $offset, filter: $filter, sort: $sort) {
      comments {
        id
        content
        isApproved
        likeCount
        reportCount
        createdAt
        updatedAt
        user {
          id
          username
          avatar
        }
        parent {
          id
          content
          user {
            id
            username
            avatar
          }
          createdAt
        }
        replies {
          id
          content
          isApproved
          likeCount
          reportCount
          createdAt
          updatedAt
          user {
            id
            username
            avatar
          }
        }
      }
      total
    }
  }
`

// 获取单个评论
export const COMMENT_QUERY = gql`
  query Comment($id: ID!) {
    comment(id: $id) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
      parent {
        id
        content
        user {
          id
          username
          avatar
        }
        createdAt
      }
      replies {
        id
        content
        isApproved
        likeCount
        reportCount
        createdAt
        updatedAt
        user {
          id
          username
          avatar
        }
      }
      blogPost {
        id
        title
        slug
      }
    }
  }
`

// ==================== MUTATIONS ====================

// 创建评论
export const CREATE_COMMENT_MUTATION = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
    }
  }
`

// 更新评论
export const UPDATE_COMMENT_MUTATION = gql`
  mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
    updateComment(id: $id, input: $input) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
    }
  }
`

// 删除评论
export const DELETE_COMMENT_MUTATION = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
      success
      message
      code
    }
  }
`

// 点赞评论
export const LIKE_COMMENT_MUTATION = gql`
  mutation LikeComment($id: ID!) {
    likeComment(id: $id) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
    }
  }
`

// 取消点赞评论
export const UNLIKE_COMMENT_MUTATION = gql`
  mutation UnlikeComment($id: ID!) {
    unlikeComment(id: $id) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
    }
  }
`

// 举报评论
export const REPORT_COMMENT_MUTATION = gql`
  mutation ReportComment($id: ID!) {
    reportComment(id: $id) {
      id
      content
      isApproved
      likeCount
      reportCount
      createdAt
      updatedAt
      user {
        id
        username
        avatar
      }
    }
  }
`

// ==================== HOOKS ====================

// 评论列表 Hook
export const useComments = (blogPostId: string, limit: number = 10, offset: number = 0) => {
  const { data, loading, error, fetchMore, refetch } = useQuery(COMMENTS_QUERY, {
    variables: { blogPostId, limit, offset },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const loadMore = () => {
    return fetchMore({
      variables: {
        offset: data?.comments?.comments?.length || 0,
      },
      updateQuery: (prev: { comments: { comments: BlogPostComment[] } }, { fetchMoreResult }: {
        fetchMoreResult?: { comments: { comments: BlogPostComment[] } }
      }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          comments: {
            ...prev.comments,
            comments: [...(prev.comments.comments || []), ...(fetchMoreResult.comments.comments || [])],
          },
        }
      },
    })
  }

  return {
    comments: data?.comments?.comments as BlogPostComment[] || [],
    total: data?.comments?.total || 0,
    loading,
    error,
    loadMore,
    refetch,
  }
}

// 单个评论 Hook
export const useComment = (id: string) => {
  const { data, loading, error } = useQuery(COMMENT_QUERY, {
    variables: { id },
    errorPolicy: 'all',
  })

  return {
    comment: data?.comment as BlogPostComment || null,
    loading,
    error,
  }
}

// 评论操作 Hook
export const useCommentActions = () => {
  // 创建评论
  const [createCommentMutation, { loading: createLoading, error: createError }] = useMutation(CREATE_COMMENT_MUTATION)

  // 更新评论
  const [updateCommentMutation, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_COMMENT_MUTATION)

  // 删除评论
  const [deleteCommentMutation, { loading: deleteLoading, error: deleteError }] = useMutation(DELETE_COMMENT_MUTATION)

  // 点赞评论
  const [likeCommentMutation, { loading: likeLoading }] = useMutation(LIKE_COMMENT_MUTATION)

  // 取消点赞评论
  const [unlikeCommentMutation, { loading: unlikeLoading }] = useMutation(UNLIKE_COMMENT_MUTATION)

  // 举报评论
  const [reportCommentMutation, { loading: reportLoading }] = useMutation(REPORT_COMMENT_MUTATION)

  // 创建评论
  const createComment = async (input: CreateCommentInput) => {
    const result = await createCommentMutation({
      variables: { input },
    })
    return result.data?.createComment as BlogPostComment
  }

  // 更新评论
  const updateComment = async (id: string, input: UpdateCommentInput) => {
    const result = await updateCommentMutation({
      variables: { id, input },
    })
    return result.data?.updateComment as BlogPostComment
  }

  // 删除评论
  const deleteComment = async (id: string) => {
    const result = await deleteCommentMutation({
      variables: { id },
    })
    return result.data?.deleteComment
  }

  // 点赞评论
  const likeComment = async (id: string) => {
    const result = await likeCommentMutation({
      variables: { id },
    })
    return result.data?.likeComment as BlogPostComment
  }

  // 取消点赞评论
  const unlikeComment = async (id: string) => {
    const result = await unlikeCommentMutation({
      variables: { id },
    })
    return result.data?.unlikeComment as BlogPostComment
  }

  // 举报评论
  const reportComment = async (id: string) => {
    const result = await reportCommentMutation({
      variables: { id },
    })
    return result.data?.reportComment as BlogPostComment
  }

  return {
    // API 函数
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    reportComment,

    // 加载状态
    loading: {
      create: createLoading,
      update: updateLoading,
      delete: deleteLoading,
      like: likeLoading,
      unlike: unlikeLoading,
      report: reportLoading,
    },

    // 错误状态
    errors: {
      create: createError,
      update: updateError,
      delete: deleteError,
    },
  }
}
