import { gql, useQuery, useMutation } from '@apollo/client'

// ==================== QUERIES ====================

// 获取通知列表
export const NOTIFICATIONS_QUERY = gql`
  query Notifications($limit: Int, $offset: Int) {
    notifications(limit: $limit, offset: $offset) {
      id
      type
      title
      content
      isRead
      createdAt
      relatedPost {
        id
        title
        slug
      }
      relatedComment {
        id
        content
      }
      relatedUser {
        id
        username
        avatar
      }
    }
  }
`

// 获取未读通知数量
export const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`

// ==================== MUTATIONS ====================

// 标记通知为已读
export const MARK_NOTIFICATION_AS_READ_MUTATION = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      isRead
    }
  }
`

// 标记所有通知为已读
export const MARK_ALL_NOTIFICATIONS_AS_READ_MUTATION = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead {
      success
      message
    }
  }
`

// 删除通知
export const DELETE_NOTIFICATION_MUTATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id) {
      success
      message
    }
  }
`

// 清空所有通知
export const CLEAR_ALL_NOTIFICATIONS_MUTATION = gql`
  mutation ClearAllNotifications {
    clearAllNotifications {
      success
      message
    }
  }
`

// ==================== HOOKS ====================

// 使用通知列表
export const useNotifications = (limit = 20, offset = 0) => {
  return useQuery(NOTIFICATIONS_QUERY, {
    variables: { limit, offset },
    fetchPolicy: 'cache-and-network',
  })
}

// 使用未读通知数量
export const useUnreadNotificationCount = (options = {}) => {
  return useQuery(UNREAD_NOTIFICATION_COUNT_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // 每30秒轮询一次
    ...options
  })
}

// 使用标记通知为已读
export const useMarkNotificationAsRead = () => {
  return useMutation(MARK_NOTIFICATION_AS_READ_MUTATION, {
    refetchQueries: [
      { query: UNREAD_NOTIFICATION_COUNT_QUERY },
    ],
  })
}

// 使用标记所有通知为已读
export const useMarkAllNotificationsAsRead = () => {
  return useMutation(MARK_ALL_NOTIFICATIONS_AS_READ_MUTATION, {
    refetchQueries: [
      { query: NOTIFICATIONS_QUERY, variables: { limit: 20, offset: 0 } },
      { query: UNREAD_NOTIFICATION_COUNT_QUERY },
    ],
  })
}

// 使用删除通知
export const useDeleteNotification = () => {
  return useMutation(DELETE_NOTIFICATION_MUTATION, {
    refetchQueries: [
      { query: NOTIFICATIONS_QUERY, variables: { limit: 20, offset: 0 } },
      { query: UNREAD_NOTIFICATION_COUNT_QUERY },
    ],
  })
}

// 使用清空所有通知
export const useClearAllNotifications = () => {
  return useMutation(CLEAR_ALL_NOTIFICATIONS_MUTATION, {
    refetchQueries: [
      { query: NOTIFICATIONS_QUERY, variables: { limit: 20, offset: 0 } },
      { query: UNREAD_NOTIFICATION_COUNT_QUERY },
    ],
  })
}
