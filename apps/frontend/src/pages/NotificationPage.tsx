import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Empty, Typography, Space, Popconfirm, message } from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import { PageHeader } from '@/components/PageHeader'
import { PageContainer } from '@/components/PageContainer'
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ClearOutlined,
  CommentOutlined,
  LikeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/api/graphql/notification'
import type { Notification } from '@/generated/graphql'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

const notificationIconToneMap = {
  COMMENT_REPLY: 'text-sky-500',
  POST_COMMENT: 'text-cyan-500',
  POST_LIKE: 'text-rose-500',
  SYSTEM: 'text-emerald-500',
  DEFAULT: 'text-slate-400',
} as const

const notificationChipToneMap = {
  COMMENT_REPLY: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/15',
  POST_COMMENT: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/15',
  POST_LIKE: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/15',
  SYSTEM: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/15',
  DEFAULT: 'bg-[color:var(--surface-container)] text-[color:var(--surface-text-secondary)] border border-[color:var(--surface-border)]',
} as const

const unreadChipClassName = 'inline-flex items-center rounded-full border border-[color:var(--color-error-soft)] bg-[color:var(--color-error-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-error-light)] dark:text-[color:var(--color-error-dark)]'

export default function NotificationPage () {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 20

  // GraphQL queries and mutations
  const { data, loading, refetch } = useNotifications(pageSize, (page - 1) * pageSize)
  const [markAsRead] = useMarkNotificationAsRead()
  const [markAllAsRead] = useMarkAllNotificationsAsRead()
  const [deleteNotification] = useDeleteNotification()
  const [clearAll] = useClearAllNotifications()

  const notifications = data?.notifications || []

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'COMMENT_REPLY':
      case 'POST_COMMENT':
        return <CommentOutlined className={`text-xl ${notificationIconToneMap[type]}`} />
      case 'POST_LIKE':
        return <LikeOutlined className={`text-xl ${notificationIconToneMap.POST_LIKE}`} />
      case 'SYSTEM':
        return <InfoCircleOutlined className={`text-xl ${notificationIconToneMap.SYSTEM}`} />
      default:
        return <BellOutlined className={`text-xl ${notificationIconToneMap.DEFAULT}`} />
    }
  }

  const getNotificationTypeChipClassName = (type: string) => {
    switch (type) {
      case 'COMMENT_REPLY':
      case 'POST_COMMENT':
      case 'POST_LIKE':
      case 'SYSTEM':
        return notificationChipToneMap[type]
      default:
        return notificationChipToneMap.DEFAULT
    }
  }

  // 获取通知类型文本
  const getNotificationTypeText = (type: string) => {
    switch (type) {
      case 'COMMENT_REPLY':
        return '评论回复'
      case 'POST_COMMENT':
        return '文章评论'
      case 'POST_LIKE':
        return '文章点赞'
      case 'SYSTEM':
        return '系统通知'
      default:
        return '未知'
    }
  }

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.isRead) {
      try {
        await markAsRead({ variables: { id: notification.id } })
      } catch {
        // 忽略错误
      }
    }

    // 跳转到相关页面
    if (notification.relatedPost) {
      navigate(`/post/${notification.relatedPost.slug}`)
    }
  }

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      message.success('所有通知已标记为已读')
      refetch()
    } catch {
      message.error('操作失败')
    }
  }

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      await deleteNotification({ variables: { id } })
      message.success('通知已删除')
      refetch()
    } catch {
      message.error('删除失败')
    }
  }

  // 清空所有通知
  const handleClearAll = async () => {
    try {
      await clearAll()
      message.success('所有通知已清空')
      refetch()
    } catch {
      message.error('操作失败')
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title='通知中心'
        icon={<BellOutlined />}
        showThemeToggle
        actions={
          <Space>
            <LiquidButton
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0}
              variant='secondary'
              className='!h-10 !px-4 flex items-center gap-2 !rounded-full'
            >
              <CheckOutlined /> 全部已读
            </LiquidButton>
            <Popconfirm
              title='确定要清空所有通知吗？'
              onConfirm={handleClearAll}
              okText='确定'
              cancelText='取消'
            >
              <LiquidButton
                disabled={notifications.length === 0}
                variant='danger'
                className='!h-10 !px-4 flex items-center gap-2 !rounded-full'
              >
                <ClearOutlined /> 清空通知
              </LiquidButton>
            </Popconfirm>
          </Space>
        }
      />

      {/* 通知列表 */}
      {notifications.length === 0 && !loading ? (
        <Empty
          description='暂无通知'
          style={{ padding: '3rem' }}
        />
      ) : (
        <List
          loading={loading}
          itemLayout='horizontal'
          dataSource={notifications}
          pagination={{
            current: page,
            pageSize,
            total: notifications.length,
            onChange: (newPage) => setPage(newPage),
            showSizeChanger: false,
          }}
          renderItem={(notification: Notification) => (
            <List.Item
              className='!border-none !p-0 !mb-4'
            >
              <article
                onClick={() => handleNotificationClick(notification)}
                className={`w-full cursor-pointer rounded-[28px] border bg-[color:var(--surface-elevated-glass)] p-4 shadow-[var(--shadow-md)] backdrop-blur-xl transition-all duration-200 md:p-5 ${
                  notification.isRead
                    ? 'border-[color:var(--surface-border)]'
                    : 'border-[color:var(--surface-border)] ring-1 ring-[color:var(--color-primary-soft)]'
                }`}
              >
                <div className='flex gap-4'>
                  {/* 通知图标 */}
                  <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-container)]'>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* 通知内容 */}
                  <div className='min-w-0 flex-1'>
                    <div className='mb-2 flex items-start justify-between gap-3'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getNotificationTypeChipClassName(notification.type)}`}>
                          {getNotificationTypeText(notification.type)}
                        </span>
                        {!notification.isRead && (
                          <span className={unreadChipClassName}>未读</span>
                        )}
                      </div>
                      <Text className='shrink-0 text-xs text-[color:var(--surface-text-tertiary)]'>
                        {dayjs(notification.createdAt).fromNow()}
                      </Text>
                    </div>

                    <div className='mb-2'>
                      <Text strong className='text-[15px] text-[color:var(--surface-text)]'>
                        {notification.title}
                      </Text>
                    </div>

                    <div>
                      <Text className='text-sm text-[color:var(--surface-text-secondary)]'>
                        {notification.content}
                      </Text>
                    </div>

                    {/* 相关用户信息 */}
                    {notification.relatedUser && (
                      <div className='mt-2 flex items-center gap-2'>
                        {notification.relatedUser.avatar && (
                          <img
                            src={notification.relatedUser.avatar}
                            alt={notification.relatedUser.username}
                            loading='lazy'
                            decoding='async'
                            className='h-6 w-6 rounded-full object-cover'
                          />
                        )}
                        <Text className='text-xs text-[color:var(--surface-text-tertiary)]'>
                          来自 {notification.relatedUser.username}
                        </Text>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className='mt-4'>
                      <Space>
                        {notification.relatedPost && (
                          <LiquidButton
                            variant='ghost'
                            className='!h-auto !p-0 text-sm !text-[color:var(--color-primary)] hover:!text-[color:var(--color-primary)]'
                          >
                            查看文章
                          </LiquidButton>
                        )}
                        <Popconfirm
                          title='确定要删除这条通知吗？'
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDelete(notification.id)
                          }}
                          okText='确定'
                          cancelText='取消'
                        >
                          <LiquidButton
                            variant='danger'
                            onClick={(e) => e.stopPropagation()}
                            className='!h-auto !p-0 !bg-transparent !border-none !shadow-none flex items-center gap-1 text-sm'
                          >
                            <DeleteOutlined /> 删除
                          </LiquidButton>
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                </div>
              </article>
            </List.Item>
          )}
        />
      )}
    </PageContainer>
  )
}
