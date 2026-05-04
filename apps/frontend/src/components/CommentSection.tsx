import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Avatar,
  Input,
  Space,
  Typography,
  Divider,
  notification,
  Spin,
  Alert,
  Tooltip
} from 'antd'
import { LiquidButton } from './LiquidButton'
import {
  UserOutlined,
  LikeOutlined,
  LikeFilled,
  FlagOutlined,
  SendOutlined,
  CommentOutlined,
  MessageOutlined,
  MoreOutlined,
  LinkOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useComments, useCommentActionsHook } from '@/hooks'
import type { BlogPostComment } from '@/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { TextArea } = Input
const { Text, Title } = Typography

interface CommentSectionProps {
  blogPostId: string;
  blogPostSlug: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ blogPostId }) => {
  const isStaticExport = import.meta.env.VITE_STATIC_EXPORT === 'true'
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

  // 静态导出模式下不请求 API
  const { comments, total, loading, error, refetch } = useComments(isStaticExport ? '' : blogPostId, 10)
  const {
    createComment,
    likeComment,
    unlikeComment,
    reportComment,
    loading: actionLoading
  } = useCommentActionsHook()

  // 处理创建评论
  const handleCreateComment = useCallback(async () => {
    if (isStaticExport) return
    if (!newComment.trim()) {
      notification.warning({
        message: '警告',
        description: '请输入评论内容',
        duration: 3,
      })
      return
    }

    try {
      await createComment({
        content: newComment,
        blogPostId,
      })

      notification.success({
        message: '成功',
        description: '评论发表成功',
        duration: 3,
      })
      setNewComment('')
      refetch()
    } catch (error) {
      notification.error({
        message: '错误',
        description: '发表评论失败: ' + (error as Error).message,
        duration: 5,
      })
    }
  }, [newComment, blogPostId, createComment, refetch, isStaticExport])

  // 处理回复评论
  const handleReplyComment = useCallback(async (parentId: string) => {
    if (!replyContent.trim()) {
      notification.warning({
        message: '警告',
        description: '请输入回复内容',
        duration: 3,
      })
      return
    }

    try {
      await createComment({
        content: replyContent,
        blogPostId,
        parentId,
      })

      notification.success({
        message: '成功',
        description: '回复发表成功',
        duration: 3,
      })
      setReplyContent('')
      setReplyingTo(null)
      refetch()
    } catch (error) {
      notification.error({
        message: '错误',
        description: '发表回复失败: ' + (error as Error).message,
        duration: 5,
      })
    }
  }, [replyContent, blogPostId, createComment, refetch])

  // 处理点赞评论
  const handleLikeComment = useCallback(async (commentId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikeComment(commentId)
      } else {
        await likeComment(commentId)
      }
      refetch()
    } catch (error) {
      notification.error({
        message: '错误',
        description: '操作失败: ' + (error as Error).message,
        duration: 5,
      })
    }
  }, [likeComment, unlikeComment, refetch])

  // 处理举报评论
  const handleReportComment = useCallback(async (commentId: string) => {
    try {
      await reportComment(commentId)
      notification.success({
        message: '成功',
        description: '举报成功，管理员会审核该评论',
        duration: 3,
      })
      refetch()
    } catch (error) {
      notification.error({
        message: '错误',
        description: '举报失败: ' + (error as Error).message,
        duration: 5,
      })
    }
  }, [reportComment, refetch])

  // 切换回复展开状态
  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }, [])

  // 生成评论短ID（用于显示）
  const getCommentShortId = useCallback((fullId: string) => {
    return fullId.slice(-8) // 取最后8位作为短ID显示
  }, [])

  // 复制评论链接
  const copyCommentLink = useCallback((commentId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${commentId}`
    navigator.clipboard.writeText(url).then(() => {
      notification.success({
        message: '成功',
        description: '评论链接已复制到剪贴板',
        duration: 2,
      })
    }).catch(() => {
      notification.error({
        message: '错误',
        description: '复制链接失败',
        duration: 2,
      })
    })
  }, [])

  // 跳转到评论
  const scrollToComment = useCallback((commentId: string) => {
    const element = document.getElementById(`comment-${commentId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedCommentId(commentId)
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedCommentId((current) => (current === commentId ? null : current))
        highlightTimeoutRef.current = null
      }, 2000)
    }
  }, [])

  // 取消回复
  const cancelReply = useCallback(() => {
    setReplyingTo(null)
    setReplyContent('')
  }, [])

  // 递归渲染评论（支持多级嵌套）
  const renderComment = useCallback((comment: BlogPostComment, depth: number = 0) => {
    const isLiked = false // 这里应该从用户状态中获取
    const hasReplies = comment.replies && comment.replies.length > 0
    const isExpanded = expandedReplies.has(comment.id)
    const maxDepth = 5 // 最大嵌套深度
    const isReplyingToThis = replyingTo === comment.id
    const shortId = getCommentShortId(comment.id)

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`w-full rounded-2xl px-3 py-2 transition-all duration-300 ${
          highlightedCommentId === comment.id
            ? 'comment-anchor-highlight bg-[color:var(--color-primary-soft)]/25 ring-1 ring-[color:var(--color-primary-soft)] shadow-[0_18px_48px_rgba(15,23,42,0.12)]'
            : ''
        }`}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 头像 */}
          <Avatar
            src={comment.user?.avatar}
            icon={<UserOutlined />}
            size={depth > 0 ? 32 : 40}
            style={{ flexShrink: 0 }}
          />

          <div style={{ flex: 1 }}>
            {/* 评论内容卡片 - Minimalist Style */}
            <div
              style={{
                // Removed background and borders for cleaner look
                padding: '4px 0',
              }}
            >
              {/* 评论头部 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Text strong style={{ fontSize: depth > 0 ? '14px' : '15px' }}>
                    {comment.user?.username || '匿名用户'}
                  </Text>
                  <Tooltip title={`评论ID: ${comment.id}`}>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: '11px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'help',
                      }}
                    >
                      #{shortId}
                    </Text>
                  </Tooltip>
                  {depth > 0 && comment.parent && (
                    <Tooltip title='回复的评论'>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: '11px',
                          cursor: 'pointer',
                          color: 'var(--color-primary)',
                        }}
                        onClick={() => scrollToComment(comment.parent!.id)}
                      >
                        回复 #{getCommentShortId(comment.parent.id)}
                      </Text>
                    </Tooltip>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tooltip title={dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                    <Text type='secondary' style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ClockCircleOutlined />
                      {dayjs(comment.createdAt).fromNow()}
                    </Text>
                  </Tooltip>
                  <Tooltip title='复制评论链接'>
                    <LiquidButton
                      variant='ghost'
                      size='small'
                      className='!h-8 !w-8 flex items-center justify-center p-0 !opacity-50 hover:!opacity-100'
                      onClick={() => copyCommentLink(comment.id)}
                    >
                      <LinkOutlined />
                    </LiquidButton>
                  </Tooltip>
                </div>
              </div>

              {/* 评论正文 */}
              <Text style={{ fontSize: depth > 0 ? '14px' : '15px', lineHeight: '1.6' }}>
                {comment.content}
              </Text>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              <LiquidButton
                variant='ghost'
                size='small'
                className='!h-8 !px-2 flex items-center gap-1 !text-[13px]'
                onClick={() => handleLikeComment(comment.id, isLiked)}
                loading={actionLoading.like || actionLoading.unlike}
              >
                {isLiked ? <LikeFilled /> : <LikeOutlined />} {comment.likeCount > 0 ? comment.likeCount : '赞'}
              </LiquidButton>

              {/* 只在未达到最大深度时显示回复按钮 */}
              {depth < maxDepth && (
                <LiquidButton
                  variant='ghost'
                  size='small'
                  className='!h-8 !px-2 flex items-center gap-1 !text-[13px]'
                  onClick={() => setReplyingTo(isReplyingToThis ? null : comment.id)}
                >
                  <MessageOutlined /> 回复
                </LiquidButton>
              )}

              {hasReplies && (
                <LiquidButton
                  variant='ghost'
                  size='small'
                  className='!h-8 !px-2 flex items-center gap-1 !text-[13px]'
                  onClick={() => toggleReplies(comment.id)}
                >
                  <MoreOutlined /> {isExpanded ? '收起' : `${comment.replies.length} 条回复`}
                </LiquidButton>
              )}

              <LiquidButton
                variant='ghost'
                size='small'
                className='!h-8 !px-2 flex items-center gap-1 !text-[13px]'
                onClick={() => handleReportComment(comment.id)}
                loading={actionLoading.report}
              >
                <FlagOutlined /> 举报
              </LiquidButton>
            </div>

            {/* 回复输入框 */}
            {isReplyingToThis && (
              <div style={{ marginTop: '12px' }}>
                <div
                  className='mb-2 rounded-xl border border-[color:var(--color-primary-soft)] bg-[color:var(--color-primary-soft)]/25 px-3 py-2'
                >
                  <Text style={{ fontSize: '12px', color: 'var(--color-primary)' }}>
                    正在回复 @{comment.user?.username || '匿名用户'} #{shortId}:
                  </Text>
                  <Text
                    type='secondary'
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {comment.content.length > 50 ? comment.content.slice(0, 50) + '...' : comment.content}
                  </Text>
                </div>
                <TextArea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`回复 @${comment.user?.username || '匿名用户'}...`}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  className='!bg-[color:var(--surface-elevated)] !border-[color:var(--surface-border)] rounded-xl text-[color:var(--surface-text)] placeholder:!text-[color:var(--surface-text-muted)]'
                  style={{ marginBottom: '8px' }}
                />
                <Space size='small'>
                  <LiquidButton
                    variant='primary'
                    size='small'
                    className='!h-8 !px-3 flex items-center gap-1'
                    onClick={() => handleReplyComment(comment.id)}
                    loading={actionLoading.create}
                  >
                    <SendOutlined /> 发送回复
                  </LiquidButton>
                  <LiquidButton variant='secondary' size='small' className='!h-8 !px-3' onClick={cancelReply}>
                    取消
                  </LiquidButton>
                </Space>
              </div>
            )}

            {/* 嵌套回复 */}
            {hasReplies && isExpanded && depth < maxDepth && (
              <div
                style={{
                  marginTop: '12px',
                  marginLeft: '16px',
                  paddingLeft: '16px',
                  borderLeft: '2px solid var(--color-border)',
                }}
              >
                {comment.replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}

            {/* 如果达到最大深度，显示简化的回复列表 */}
            {hasReplies && isExpanded && depth >= maxDepth && (
              <div
                style={{
                  marginTop: '12px',
                  marginLeft: '16px',
                  paddingLeft: '16px',
                  borderLeft: '2px solid var(--color-border)',
                }}
              >
                <Text type='secondary' style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  更多回复请点击具体评论查看
                </Text>
                {comment.replies.slice(0, 3).map(reply => (
                  <div
                    key={reply.id}
                    style={{
                      marginBottom: '8px',
                      padding: '8px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: '6px',
                    }}
                  >
                    <Text strong style={{ fontSize: '12px' }}>
                      {reply.user?.username || '匿名用户'}:
                    </Text>
                    <Text style={{ marginLeft: '8px', fontSize: '12px' }}>{reply.content}</Text>
                  </div>
                ))}
                {comment.replies.length > 3 && (
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    还有 {comment.replies.length - 3} 条回复...
                  </Text>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }, [
    expandedReplies,
    replyingTo,
    replyContent,
    handleLikeComment,
    handleReportComment,
    handleReplyComment,
    actionLoading,
    toggleReplies,
    cancelReply,
    getCommentShortId,
    copyCommentLink,
    scrollToComment,
    highlightedCommentId
  ])

  // 处理URL中的评论锚点
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#comment-') && comments.length > 0) {
      const commentId = hash.replace('#comment-', '')
      // 等待渲染完成后滚动
      setTimeout(() => {
        scrollToComment(commentId)
      }, 100)
    }
  }, [comments, scrollToComment])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  if (error) {
    return (
      <Alert
        message='加载评论失败'
        description={error.message}
        type='error'
        showIcon
      />
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <CommentOutlined /> 评论 ({isStaticExport ? 0 : total})
        </Title>
      </div>

      {/* 发表评论 */}
      {!isStaticExport
        ? (
          <div
            style={{
              marginBottom: '2rem',
              padding: '0',
              background: 'transparent',
            }}
          >
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder='What are your thoughts?'
              autoSize={{ minRows: 3, maxRows: 6 }}
              className='!bg-[color:var(--surface-elevated)] !border-[color:var(--surface-border)] rounded-xl text-[color:var(--surface-text)] placeholder:!text-[color:var(--surface-text-muted)]'
              style={{ marginBottom: '12px', padding: '16px' }}
            />
            <LiquidButton
              variant='primary'
              className='!h-10 !px-6 flex items-center gap-2'
              onClick={handleCreateComment}
              loading={actionLoading.create}
            >
              <SendOutlined /> 发表评论
            </LiquidButton>
          </div>
          )
        : (
          <Alert
            message='静态模式提示'
            description='当前处于静态导出浏览模式，评论功能已禁用。如需参与讨论，请访问在线版本。'
            type='info'
            showIcon
            className='rounded-xl mb-8'
          />
          )}

      <Divider style={{ margin: '1.5rem 0' }} />

      {/* 评论列表 */}
      {loading && !isStaticExport ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <Spin size='large' />
          <Text style={{ display: 'block', marginTop: '1rem' }}>正在加载评论...</Text>
        </div>
      ) : comments.length > 0 ? (
        <div>
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              style={{
                paddingBottom: '1.5rem',
                marginBottom: '1.5rem',
                borderBottom: index < comments.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {renderComment(comment, 0)}
            </div>
          ))}

          {/* 分页 */}
          {total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              <LiquidButton variant='secondary' className='!px-8'>
                加载更多评论
              </LiquidButton>
            </div>
          )}
        </div>
      ) : (
        <div className='rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] px-6 py-12 text-center backdrop-blur-xl'>
          <CommentOutlined style={{ fontSize: '3rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }} />
          <Text type='secondary' style={{ display: 'block' }}>
            暂无评论，快来发表第一条评论吧！
          </Text>
        </div>
      )}
    </div>
  )
}

export default CommentSection
