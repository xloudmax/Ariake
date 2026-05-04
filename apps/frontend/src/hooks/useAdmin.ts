import { useState, useCallback, useMemo } from 'react'
import {
  useUserManagement,
  useServerDashboard,
  useInviteCodeManagement,
  useAdminOperations,
  useAdminAuth,
  useSystemStats
} from '../api/graphql'
import { UserRole, AdminCreateUserInput, CreateInviteCodeInput } from '../generated/graphql'

// 用户管理hook
export const useUserAdmin = () => {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>()
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | undefined>()

  const { users, loading, error, loadMore, refetch } = useUserManagement(search, roleFilter, verifiedFilter)
  const { createUser, updateUser, deleteUser, loading: operationLoading, errors: operationErrors } = useAdminOperations()

  // 创建用户
  const handleCreateUser = useCallback(async (userData: AdminCreateUserInput) => {
    const result = await createUser(userData)
    await refetch()
    return result
  }, [createUser, refetch])

  // 更新用户
  const handleUpdateUser = useCallback(async (
    id: string,
    updates: {
      username?: string;
      email?: string;
      role?: UserRole;
      isVerified?: boolean;
      isActive?: boolean;
    }
  ) => {
    const result = await updateUser(id, updates)
    await refetch()
    return result
  }, [updateUser, refetch])

  // 删除用户
  const handleDeleteUser = useCallback(async (id: string) => {
    const result = await deleteUser(id)
    await refetch()
    return result
  }, [deleteUser, refetch])

  // 批量操作
  const handleBatchUpdateUsers = useCallback(async (
    userIds: string[],
    updates: {
      role?: UserRole;
      isVerified?: boolean;
      isActive?: boolean;
    }
  ) => {
    const results = []

    for (const id of userIds) {
      try {
        const result = await updateUser(id, updates)
        results.push({ id, success: true, result })
      } catch (error) {
        results.push({ id, success: false, error })
      }
    }

    await refetch()
    return results
  }, [updateUser, refetch])

  // 统计信息
  const userStats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u: { role: string; }) => u.role === 'ADMIN').length
    const verified = users.filter((u: { isVerified: boolean; }) => u.isVerified).length
    const active = users.filter((u: { isActive: boolean; }) => u.isActive).length

    return {
      total,
      admins,
      regularUsers: total - admins,
      verified,
      unverified: total - verified,
      active,
      inactive: total - active,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      activeRate: total > 0 ? (active / total) * 100 : 0,
    }
  }, [users])

  return {
    // 数据
    users,
    userStats,

    // 状态
    loading: loading || operationLoading.createUser || operationLoading.updateUser || operationLoading.deleteUser,
    error: error || operationErrors.createUser || operationErrors.updateUser || operationErrors.deleteUser,

    // 过滤器
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    verifiedFilter,
    setVerifiedFilter,

    // 操作
    createUser: handleCreateUser,
    updateUser: handleUpdateUser,
    deleteUser: handleDeleteUser,
    batchUpdateUsers: handleBatchUpdateUsers,
    loadMore,
    refetch,
  }
}

// 邀请码管理hook
export const useInviteAdmin = () => {
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()

  const { inviteCodes, loading, error, loadMore, refetch } = useInviteCodeManagement(activeFilter)
  const { createInviteCode, deactivateInviteCode, loading: operationLoading, errors: operationErrors } = useAdminOperations()

  // 创建邀请码
  const handleCreateInviteCode = useCallback(async (inviteData: CreateInviteCodeInput) => {
    const result = await createInviteCode(inviteData)
    await refetch()
    return result
  }, [createInviteCode, refetch])

  // 停用邀请码
  const handleDeactivateInviteCode = useCallback(async (id: string) => {
    const result = await deactivateInviteCode(id)
    await refetch()
    return result
  }, [deactivateInviteCode, refetch])

  // 批量停用邀请码
  const handleBatchDeactivate = useCallback(async (ids: string[]) => {
    const results = []

    for (const id of ids) {
      try {
        const result = await deactivateInviteCode(id)
        results.push({ id, success: true, result })
      } catch (error) {
        results.push({ id, success: false, error })
      }
    }

    await refetch()
    return results
  }, [deactivateInviteCode, refetch])

  // 统计信息
  const inviteStats = useMemo(() => {
    const total = inviteCodes.length
    const active = inviteCodes.filter((code: { isActive: boolean; }) => code.isActive).length
    const used = inviteCodes.filter((code: { usedBy: unknown; }) => !!code.usedBy).length
    const expired = inviteCodes.filter((code: { expiresAt: string | number | Date; }) => {
      const now = new Date()
      const expiresAt = new Date(code.expiresAt)
      return expiresAt < now
    }).length

    return {
      total,
      active,
      inactive: total - active,
      used,
      unused: total - used,
      expired,
      usageRate: total > 0 ? (used / total) * 100 : 0,
    }
  }, [inviteCodes])

  return {
    // 数据
    inviteCodes,
    inviteStats,

    // 状态
    loading: loading || operationLoading.createInvite || operationLoading.deactivateInvite,
    error: error || operationErrors.createInvite || operationErrors.deactivateInvite,

    // 过滤器
    activeFilter,
    setActiveFilter,

    // 操作
    createInviteCode: handleCreateInviteCode,
    deactivateInviteCode: handleDeactivateInviteCode,
    batchDeactivate: handleBatchDeactivate,
    loadMore,
    refetch,
  }
}

// 系统管理hook
export const useSystemAdmin = () => {
  const { dashboard, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useServerDashboard()
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useSystemStats()
  const { clearCache, rebuildSearchIndex, loading: operationLoading, errors: operationErrors } = useAdminOperations()

  // 清理缓存
  const handleClearCache = useCallback(async () => {
    const result = await clearCache()
    // 刷新仪表盘数据
    await refetchDashboard()
    return result
  }, [clearCache, refetchDashboard])

  // 重建搜索索引
  const handleRebuildSearchIndex = useCallback(async () => {
    return await rebuildSearchIndex()
  }, [rebuildSearchIndex])

  // 格式化内存使用量
  const formatMemoryUsage = useCallback((memoryStr: string) => {
    // 后端已经返回了格式化的字符串（如"1.50 MB"），直接返回即可
    return memoryStr
  }, [])

  // 计算系统健康度
  const systemHealth = useMemo(() => {
    if (!dashboard) return null

    const memoryUsage = parseInt(dashboard.memory.alloc) / parseInt(dashboard.memory.sys)
    const goroutineCount = dashboard.goroutines

    let healthScore = 100

    // 内存使用率过高扣分
    if (memoryUsage > 0.8) healthScore -= 30
    else if (memoryUsage > 0.6) healthScore -= 15

    // Goroutine过多扣分
    if (goroutineCount > 1000) healthScore -= 20
    else if (goroutineCount > 500) healthScore -= 10

    let status: 'excellent' | 'good' | 'warning' | 'critical'
    if (healthScore >= 90) status = 'excellent'
    else if (healthScore >= 70) status = 'good'
    else if (healthScore >= 50) status = 'warning'
    else status = 'critical'

    return {
      score: Math.max(0, healthScore),
      status,
      memoryUsage: memoryUsage * 100,
      goroutineCount,
    }
  }, [dashboard])

  return {
    // 数据
    dashboard,
    stats,
    systemHealth,

    // 状态
    loading: dashboardLoading || statsLoading || operationLoading.clearCache || operationLoading.rebuildIndex,
    error: dashboardError || statsError || operationErrors.clearCache || operationErrors.rebuildIndex,

    // 操作
    clearCache: handleClearCache,
    rebuildSearchIndex: handleRebuildSearchIndex,
    refetchDashboard,
    refetchStats,

    // 工具函数
    formatMemoryUsage,
  }
}

// 管理员权限和导航hook
export const useAdminNavigation = () => {
  const { isAdmin, requireAdmin, userRole } = useAdminAuth()
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'users' | 'posts' | 'comments' | 'invites' | 'tags' | 'analytics' | 'system' | 'notion'>('dashboard')

  // 导航项配置
  const navigationItems = useMemo(() => [
    {
      id: 'dashboard',
      label: '仪表盘',
      icon: 'dashboard',
      description: '系统概览和统计信息',
    },
    {
      id: 'users',
      label: '用户管理',
      icon: 'users',
      description: '管理系统用户',
    },
    {
      id: 'posts',
      label: '文章管理',
      icon: 'posts',
      description: '管理博客文章',
    },
    {
      id: 'comments',
      label: '评论管理',
      icon: 'comments',
      description: '审核和管理评论',
    },
    {
      id: 'invites',
      label: '邀请码',
      icon: 'ticket',
      description: '邀请码管理',
    },
    {
      id: 'tags',
      label: '标签管理',
      icon: 'tags',
      description: '标签和分类管理',
    },
    {
      id: 'analytics',
      label: '搜索分析',
      icon: 'analytics',
      description: '搜索统计和趋势',
    },
    {
      id: 'notion',
      label: 'Notion同步',
      icon: 'cloud-sync',
      description: 'Notion内容同步管理',
    },
    {
      id: 'system',
      label: '系统管理',
      icon: 'settings',
      description: '系统维护和配置',
    },
  ], [])

  // 权限检查
  const checkAdminAccess = useCallback(() => {
    try {
      requireAdmin()
      return true
    } catch {
      return false
    }
  }, [requireAdmin])

  // 安全导航
  const navigateTo = useCallback((tab: typeof currentTab) => {
    if (checkAdminAccess()) {
      setCurrentTab(tab)
    }
  }, [checkAdminAccess])

  return {
    isAdmin,
    userRole,
    currentTab,
    setCurrentTab: navigateTo,
    navigationItems,
    checkAdminAccess,
  }
}
