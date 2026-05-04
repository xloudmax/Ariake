import { useMemo, useCallback } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import type {
  UserRole,
  AdminCreateUserInput,
  CreateInviteCodeInput,
} from '@/generated/graphql'

// ==================== QUERIES ====================

// 获取用户列表（管理员）
export const USERS_QUERY = gql`
  query Users($limit: Int, $offset: Int, $search: String, $role: UserRole, $isVerified: Boolean) {
    users(limit: $limit, offset: $offset, search: $search, role: $role, isVerified: $isVerified) {
      id
      username
      email
      role
      isVerified
      isActive
      avatar
      bio
      lastLoginAt
      emailVerifiedAt
      createdAt
      updatedAt
      postsCount
    }
  }
`

// 获取服务器仪表盘
export const SERVER_DASHBOARD_QUERY = gql`
  query ServerDashboard {
    serverDashboard {
      serverTime
      hostname
      goVersion
      cpuCount
      goroutines
      memory {
        alloc
        totalAlloc
        sys
        heapAlloc
        heapSys
      }
      uptime
      userCount
      postCount
      todayRegistrations
      todayPosts
    }
  }
`

// 获取邀请码列表
export const INVITE_CODES_QUERY = gql`
  query InviteCodes($limit: Int, $offset: Int, $isActive: Boolean) {
    inviteCodes(limit: $limit, offset: $offset, isActive: $isActive) {
      id
      code
      createdBy {
        id
        username
        avatar
        role
      }
      usedBy {
        id
        username
        avatar
      }
      usedAt
      expiresAt
      maxUses
      currentUses
      isActive
      description
      createdAt
    }
  }
`

// ==================== MUTATIONS ====================

// 管理员创建用户
export const ADMIN_CREATE_USER_MUTATION = gql`
  mutation AdminCreateUser($input: AdminCreateUserInput!) {
    adminCreateUser(input: $input) {
      id
      username
      email
      role
      isVerified
      isActive
      createdAt
    }
  }
`

// 管理员更新用户
export const ADMIN_UPDATE_USER_MUTATION = gql`
  mutation AdminUpdateUser(
    $id: ID!
    $username: String
    $email: String
    $role: UserRole
    $isVerified: Boolean
    $isActive: Boolean
  ) {
    adminUpdateUser(
      id: $id
      username: $username
      email: $email
      role: $role
      isVerified: $isVerified
      isActive: $isActive
    ) {
      id
      username
      email
      role
      isVerified
      isActive
      updatedAt
    }
  }
`

// 管理员删除用户
export const ADMIN_DELETE_USER_MUTATION = gql`
  mutation AdminDeleteUser($id: ID!) {
    adminDeleteUser(id: $id) {
      success
      message
      code
    }
  }
`

// 创建邀请码
export const CREATE_INVITE_CODE_MUTATION = gql`
  mutation CreateInviteCode($input: CreateInviteCodeInput!) {
    createInviteCode(input: $input) {
      id
      code
      expiresAt
      maxUses
      description
      createdAt
    }
  }
`

// 停用邀请码
export const DEACTIVATE_INVITE_CODE_MUTATION = gql`
  mutation DeactivateInviteCode($id: ID!) {
    deactivateInviteCode(id: $id) {
      success
      message
      code
    }
  }
`

// 清理缓存
export const CLEAR_CACHE_MUTATION = gql`
  mutation ClearCache {
    clearCache {
      success
      message
      code
    }
  }
`

// 重建搜索索引
export const REBUILD_SEARCH_INDEX_MUTATION = gql`
  mutation RebuildSearchIndex {
    rebuildSearchIndex {
      success
      message
      code
    }
  }
`

// Notion同步
export const SYNC_NOTION_MUTATION = gql`
  mutation SyncNotion($pageId: String) {
    syncNotion(pageId: $pageId) {
      success
      message
      code
    }
  }
`

// 获取Notion页面列表
export const GET_NOTION_PAGES_QUERY = gql`
  query GetNotionPages {
    getNotionPages {
      id
      title
      lastEditedAt
      url
    }
  }
`

// GitHub 部署配置
export const UPDATE_GITHUB_CONFIG_MUTATION = gql`
  mutation UpdateGitHubConfig($repo: String!, $token: String!) {
    updateGitHubConfig(repo: $repo, token: $token) {
      success
      message
      code
    }
  }
`

// 执行 GitHub Pages 部署
export const DEPLOY_TO_GITHUB_PAGES_MUTATION = gql`
  mutation DeployToGitHubPages {
    deployToGitHubPages {
      success
      message
      code
    }
  }
`

// 获取 GitHub 配置
export const GET_GITHUB_CONFIG_QUERY = gql`
  query GetGitHubConfig {
    getGitHubConfig {
      repo
      token
    }
  }
`

// ==================== CUSTOM HOOKS ====================

// 用户管理 Hook
export const useUserManagement = (search?: string, role?: UserRole, isVerified?: boolean, limit: number = 20) => {
  const { data, loading, error, fetchMore, refetch } = useQuery(USERS_QUERY, {
    variables: { limit, offset: 0, search, role, isVerified },
    errorPolicy: 'all',
    context: { endpoint: 'admin' }, // 使用管理员端点
  })

  const loadMore = () => {
    return fetchMore({
      variables: {
        offset: data?.users?.length || 0,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          users: [...(prev.users || []), ...(fetchMoreResult.users || [])],
        }
      },
    })
  }

  return {
    users: data?.users || [],
    loading,
    error,
    loadMore,
    refetch,
  }
}

// 服务器仪表盘 Hook
export const useServerDashboard = () => {
  const { data, loading, error, refetch } = useQuery(SERVER_DASHBOARD_QUERY, {
    errorPolicy: 'all',
    context: { endpoint: 'admin' }, // 使用管理员端点
    pollInterval: 30000, // 每30秒刷新一次
  })

  return {
    dashboard: data?.serverDashboard || null,
    loading,
    error,
    refetch,
  }
}

// 邀请码管理 Hook
export const useInviteCodeManagement = (isActive?: boolean, limit: number = 20) => {
  const { data, loading, error, fetchMore, refetch } = useQuery(INVITE_CODES_QUERY, {
    variables: { limit, offset: 0, isActive },
    errorPolicy: 'all',
    context: { endpoint: 'admin' }, // 使用管理员端点
  })

  const loadMore = () => {
    return fetchMore({
      variables: {
        offset: data?.inviteCodes?.length || 0,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          inviteCodes: [...(prev.inviteCodes || []), ...(fetchMoreResult.inviteCodes || [])],
        }
      },
    })
  }

  return {
    inviteCodes: data?.inviteCodes || [],
    loading,
    error,
    loadMore,
    refetch,
  }
}

// 管理员操作 Hook
export const useAdminOperations = () => {
  // 创建用户
  const [adminCreateUserMutation, { loading: createUserLoading, error: createUserError }] = useMutation(
    ADMIN_CREATE_USER_MUTATION,
    {
      context: { endpoint: 'admin' },
      refetchQueries: [{ query: USERS_QUERY }],
      awaitRefetchQueries: true,
    }
  )

  // 更新用户
  const [adminUpdateUserMutation, { loading: updateUserLoading, error: updateUserError }] = useMutation(
    ADMIN_UPDATE_USER_MUTATION,
    {
      context: { endpoint: 'admin' },
    }
  )

  // 删除用户
  const [adminDeleteUserMutation, { loading: deleteUserLoading, error: deleteUserError }] = useMutation(
    ADMIN_DELETE_USER_MUTATION,
    {
      context: { endpoint: 'admin' },
      refetchQueries: [{ query: USERS_QUERY }],
      awaitRefetchQueries: true,
    }
  )

  // 创建邀请码
  const [createInviteCodeMutation, { loading: createInviteLoading, error: createInviteError }] = useMutation(
    CREATE_INVITE_CODE_MUTATION,
    {
      context: { endpoint: 'admin' },
      refetchQueries: [{ query: INVITE_CODES_QUERY }],
      awaitRefetchQueries: true,
    }
  )

  // 停用邀请码
  const [deactivateInviteCodeMutation, { loading: deactivateInviteLoading, error: deactivateInviteError }] = useMutation(
    DEACTIVATE_INVITE_CODE_MUTATION,
    {
      context: { endpoint: 'admin' },
    }
  )

  // 清理缓存
  const [clearCacheMutation, { loading: clearCacheLoading, error: clearCacheError }] = useMutation(
    CLEAR_CACHE_MUTATION,
    {
      context: { endpoint: 'admin' },
    }
  )

  // 重建搜索索引
  const [rebuildSearchIndexMutation, { loading: rebuildIndexLoading, error: rebuildIndexError }] = useMutation(
    REBUILD_SEARCH_INDEX_MUTATION,
    {
      context: { endpoint: 'admin' },
    }
  )

  // API 函数
  const createUser = async (userData: AdminCreateUserInput) => {
    const result = await adminCreateUserMutation({
      variables: { input: userData },
    })
    return result.data?.adminCreateUser
  }

  const updateUser = async (
    id: string,
    updates: {
      username?: string;
      email?: string;
      role?: UserRole;
      isVerified?: boolean;
      isActive?: boolean;
    }
  ) => {
    const result = await adminUpdateUserMutation({
      variables: { id, ...updates },
      update: (cache, { data }) => {
        if (data?.adminUpdateUser) {
          // 更新用户列表缓存
          cache.modify({
            fields: {
              users (existingUsers = []) {
                return existingUsers.map((userRef: { __ref?: string }) => {
                  if (cache.identify(userRef) === cache.identify(data.adminUpdateUser)) {
                    return { ...userRef, ...data.adminUpdateUser }
                  }
                  return userRef
                })
              },
            },
          })
        }
      },
    })
    return result.data?.adminUpdateUser
  }

  const deleteUser = async (id: string) => {
    const result = await adminDeleteUserMutation({
      variables: { id },
      update: (cache) => {
        // 从用户列表缓存中移除
        cache.evict({ id: cache.identify({ __typename: 'User', id }) })
        cache.gc()
      },
    })
    return result.data?.adminDeleteUser
  }

  const createInviteCode = async (inviteData: CreateInviteCodeInput) => {
    const result = await createInviteCodeMutation({
      variables: { input: inviteData },
    })
    return result.data?.createInviteCode
  }

  const deactivateInviteCode = async (id: string) => {
    const result = await deactivateInviteCodeMutation({
      variables: { id },
      update: (cache, { data }) => {
        if (data?.deactivateInviteCode.success) {
          cache.modify({
            id: cache.identify({ __typename: 'InviteCode', id }),
            fields: {
              isActive: () => false,
            },
          })
        }
      },
    })
    return result.data?.deactivateInviteCode
  }

  const clearCache = async () => {
    const result = await clearCacheMutation()
    // 可选：清理Apollo Client缓存
    // apolloClient.clearStore();
    return result.data?.clearCache
  }

  const rebuildSearchIndex = async () => {
    const result = await rebuildSearchIndexMutation()
    return result.data?.rebuildSearchIndex
  }

  return {
    // API 函数
    createUser,
    updateUser,
    deleteUser,
    createInviteCode,
    deactivateInviteCode,
    clearCache,
    rebuildSearchIndex,

    // 加载状态
    loading: {
      createUser: createUserLoading,
      updateUser: updateUserLoading,
      deleteUser: deleteUserLoading,
      createInvite: createInviteLoading,
      deactivateInvite: deactivateInviteLoading,
      clearCache: clearCacheLoading,
      rebuildIndex: rebuildIndexLoading,
    },

    // 错误状态
    errors: {
      createUser: createUserError,
      updateUser: updateUserError,
      deleteUser: deleteUserError,
      createInvite: createInviteError,
      deactivateInvite: deactivateInviteError,
      clearCache: clearCacheError,
      rebuildIndex: rebuildIndexError,
    },
  }
}

// 权限检查 Hook
export const useAdminAuth = () => {
  const getCurrentUserRole = (): string | null => {
    try {
      const token = localStorage.getItem('token')
      if (!token || token === 'undefined') return null

      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.role || null
    } catch {
      return null
    }
  }

  const isAdmin = (): boolean => {
    const role = getCurrentUserRole()
    return role === 'admin' || role === 'ADMIN'
  }

  const requireAdmin = (): void => {
    if (!isAdmin()) {
      throw new Error('管理员权限required')
    }
  }

  return {
    isAdmin,
    requireAdmin,
    userRole: getCurrentUserRole(),
  }
}

// 系统统计 Hook（从仪表盘数据中提取）
export const useSystemStats = () => {
  const { dashboard, loading, error, refetch } = useServerDashboard()

  const stats = dashboard
    ? {
        userCount: dashboard.userCount,
        postCount: dashboard.postCount,
        todayRegistrations: dashboard.todayRegistrations,
        todayPosts: dashboard.todayPosts,
        uptime: dashboard.uptime,
        memoryUsage: {
          alloc: dashboard.memory.alloc,
          totalAlloc: dashboard.memory.totalAlloc,
          sys: dashboard.memory.sys,
        },
        systemInfo: {
          hostname: dashboard.hostname,
          goVersion: dashboard.goVersion,
          cpuCount: dashboard.cpuCount,
          goroutines: dashboard.goroutines,
        },
      }
    : null

  return {
    stats,
    loading,
    error,
    refetch,
  }
}

// ==================== COMMENT MANAGEMENT ====================

// 获取所有评论（管理员）
export const ALL_COMMENTS_QUERY = gql`
  query AllComments($limit: Int, $offset: Int, $filter: CommentFilterInput, $sort: CommentSortInput) {
    comments(limit: $limit, offset: $offset, filter: $filter, sort: $sort) {
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
        blogPost {
          id
          title
          slug
        }
      }
      total
    }
  }
`

// 审核评论
export const APPROVE_COMMENT_MUTATION = gql`
  mutation ApproveComment($id: ID!) {
    approveComment(id: $id) {
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

// 拒绝评论
export const REJECT_COMMENT_MUTATION = gql`
  mutation RejectComment($id: ID!) {
    rejectComment(id: $id) {
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

// 管理员评论列表 Hook
export const useAdminComments = (filter?: { isApproved?: boolean }, limit: number = 20) => {
  const { data, loading, error, fetchMore, refetch } = useQuery(ALL_COMMENTS_QUERY, {
    variables: { limit, offset: 0, filter },
    errorPolicy: 'all',
    context: { endpoint: 'admin' },
  })

  const loadMore = () => {
    return fetchMore({
      variables: {
        offset: data?.comments?.comments?.length || 0,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          comments: {
            ...prev.comments,
            comments: [
              ...(prev.comments?.comments || []),
              ...(fetchMoreResult.comments?.comments || []),
            ],
          },
        }
      },
    })
  }

  return {
    comments: data?.comments?.comments || [],
    total: data?.comments?.total || 0,
    loading,
    error,
    loadMore,
    refetch,
  }
}

// 评论审核操作 Hook
export const useCommentModeration = () => {
  // 批准评论
  const [approveCommentMutation, { loading: approveLoading, error: approveError }] = useMutation(
    APPROVE_COMMENT_MUTATION,
    {
      context: { endpoint: 'admin' },
      refetchQueries: [{ query: ALL_COMMENTS_QUERY }],
      awaitRefetchQueries: true,
    }
  )

  // 拒绝评论
  const [rejectCommentMutation, { loading: rejectLoading, error: rejectError }] = useMutation(
    REJECT_COMMENT_MUTATION,
    {
      context: { endpoint: 'admin' },
      refetchQueries: [{ query: ALL_COMMENTS_QUERY }],
      awaitRefetchQueries: true,
    }
  )

  const approveComment = async (id: string) => {
    const result = await approveCommentMutation({
      variables: { id },
      update: (cache, { data }) => {
        if (data?.approveComment) {
          cache.modify({
            id: cache.identify({ __typename: 'BlogPostComment', id }),
            fields: {
              isApproved: () => true,
            },
          })
        }
      },
    })
    return result.data?.approveComment
  }

  const rejectComment = async (id: string) => {
    const result = await rejectCommentMutation({
      variables: { id },
      update: (cache, { data }) => {
        if (data?.rejectComment) {
          cache.modify({
            id: cache.identify({ __typename: 'BlogPostComment', id }),
            fields: {
              isApproved: () => false,
            },
          })
        }
      },
    })
    return result.data?.rejectComment
  }

  return {
    // API 函数
    approveComment,
    rejectComment,

    // 加载状态
    loading: {
      approve: approveLoading,
      reject: rejectLoading,
    },

    // 错误状态
    errors: {
      approve: approveError,
      reject: rejectError,
    },
  }
}

// Notion同步 Hook
export const useNotionSync = () => {
  const [syncNotionMutation, { loading, error }] = useMutation(SYNC_NOTION_MUTATION, {
    context: { endpoint: 'admin' },
  })

  const syncNotion = async (pageId?: string) => {
    const result = await syncNotionMutation({
      variables: { pageId },
    })
    return result.data?.syncNotion
  }

  return {
    syncNotion,
    loading,
    error,
  }
}

// 获取Notion页面列表 Hook
export const useNotionPages = () => {
  const { data, loading, error, refetch } = useQuery(GET_NOTION_PAGES_QUERY, {
    context: { endpoint: 'admin' },
    fetchPolicy: 'network-only', // 总是从服务器获取最新列表
  })

  return {
    pages: data?.getNotionPages || [],
    loading,
    error,
    refetch,
  }
}

// GitHub 部署 Hook
export const useGitHubDeployment = () => {
  const { data, loading: loadingConfig, error: configError, refetch } = useQuery(GET_GITHUB_CONFIG_QUERY, {
    context: { endpoint: 'admin' },
    fetchPolicy: 'network-only',
  })

  const [updateConfigMutation, { loading: updatingConfig, error: updateConfigError }] = useMutation(UPDATE_GITHUB_CONFIG_MUTATION, {
    context: { endpoint: 'admin' },
  })

  const [deployMutation, { loading: deploying, error: deployError }] = useMutation(DEPLOY_TO_GITHUB_PAGES_MUTATION, {
    context: { endpoint: 'admin' },
  })

  const updateConfig = useCallback(async (repo: string, token: string) => {
    const result = await updateConfigMutation({
      variables: { repo, token },
    })
    if (result.data?.updateGitHubConfig?.success) {
      await refetch()
    }
    return result.data?.updateGitHubConfig
  }, [updateConfigMutation, refetch])

  const deploy = useCallback(async () => {
    const result = await deployMutation()
    return result.data?.deployToGitHubPages
  }, [deployMutation])

  return useMemo(() => ({
    config: data?.getGitHubConfig || { repo: '', token: '' },
    updateConfig,
    deploy,
    loading: {
      loadingConfig,
      updatingConfig,
      deploying,
    },
    errors: {
      config: configError,
      updateConfig: updateConfigError,
      deploy: deployError,
    }
  }), [
    data?.getGitHubConfig,
    loadingConfig,
    updatingConfig,
    deploying,
    configError,
    updateConfigError,
    deployError,
    updateConfig,
    deploy
  ])
}
