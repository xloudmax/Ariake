import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Avatar,
  Spin,
  Alert,
  Divider,
  Tooltip,
  notification,
  Grid
} from 'antd'
import { LiquidButton } from '../components/LiquidButton'
import {
  ArrowLeftOutlined,
  EyeOutlined,
  LikeOutlined,
  ShareAltOutlined,
  EditOutlined,
  CalendarOutlined,
  UserOutlined,
  CommentOutlined,
  CloudSyncOutlined
} from '@ant-design/icons'
import { useQuery } from '@apollo/client'
import { POST_QUERY } from '@/api/graphql/blog'
import { useAppUser, useLike } from '@/hooks'
import BackToTop from '@/components/BackToTop'
import { PageContainer } from '@/components/PageContainer'
import { PageHeader } from '@/components/PageHeader'
import { measureInlineLabelWidth } from '@/utils/pretextMetrics'
import { countMarkdownHeadings } from '@/utils/markdownFeatures'
import { scheduleIdleTask } from '@/utils/performance'
import confetti from 'canvas-confetti'

const MarkdownViewer = lazy(() => import('../components/MarkdownViewer'))
const CommentSection = lazy(() => import('@/components/CommentSection'))
const TableOfContents = lazy(() => import('@/components/TableOfContents'))

export default function PostDetailPage () {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAppUser()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  // Static export support
  const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'

  // 获取文章详情
  const { data: apolloData, loading: apolloLoading, error: apolloError, refetch } = useQuery(POST_QUERY, {
    variables: { id: slug },
    skip: isStatic || !slug,
    errorPolicy: 'all'
  })

  const [staticPost, setStaticPost] = useState<Record<string, unknown> | null>(null)
  const [staticLoading, setStaticLoading] = useState(isStatic)
  const [staticError, setStaticError] = useState<Error | null>(null)

  useEffect(() => {
    if (isStatic && slug) {
      setStaticLoading(true)
      fetch(`./static/posts/${slug}.json`)
        .then(res => res.json())
        .then(data => {
          setStaticPost(data)
          setStaticLoading(false)
        })
        .catch(err => {
          setStaticError(err)
          setStaticLoading(false)
        })
    }
  }, [isStatic, slug])

  const loading = isStatic ? staticLoading : apolloLoading
  const error = isStatic ? staticError : apolloError
  const post = isStatic ? staticPost : apolloData?.post

  // 确保 tags 始终是数组 (处理 SSG 模式下的字符串数据)
  const safeTags: string[] = Array.isArray(post?.tags)
    ? post.tags
    : (typeof post?.tags === 'string' ? (post.tags as string).split(',').filter(Boolean) : [])

  const tagWidths = safeTags.map((tag) => ({
    tag,
    width: measureInlineLabelWidth({
      text: tag,
      font: isMobile ? '600 13px Inter' : '600 14px Inter',
      chromeWidth: 34,
      minWidth: 72,
      maxWidth: 180,
    })
  }))

  // 使用优化后的点赞 Hook
  const { isLiked, likeCount, handleLike } = useLike({
    postId: post?.id || '',
    postSlug: post?.slug || '',
    initialIsLiked: post?.isLiked || false,
    initialLikeCount: post?.stats?.likeCount || 0,
  })

  const likeButtonRef = useRef<HTMLButtonElement>(null)
  const actionButtonClassName = 'flex min-w-[108px] items-center justify-center gap-2 !h-11 !px-5'
  const [showComments, setShowComments] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const headingCount = useMemo(() => countMarkdownHeadings(String(post?.content || '')), [post?.content])

  const onLikeClick = async () => {
    if (!isLiked) {
      const rect = likeButtonRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (rect.left + rect.width / 2) / window.innerWidth
        const y = (rect.top + rect.height / 2) / window.innerHeight

        confetti({
          particleCount: 40,
          spread: 50,
          origin: { x, y },
          scalar: 0.7,
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          disableForReducedMotion: true,
          zIndex: 10000,
        })
      }
    }
    await handleLike()
  }

  // Sync with native mini-player (Apple Music style)
  useEffect(() => {
    if (post && window.webkit?.messageHandlers?.updateArticle) {
      const payload = {
        title: post.title,
        author: post.author.username
      }
      window.webkit.messageHandlers.updateArticle.postMessage(payload)
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Sent article update to native:', payload)
    }
  }, [post])

  useEffect(() => {
    setShowComments(false)
    setShowToc(false)

    if (!post?.content) {
      return
    }

    const cancelCommentTask = post.status === 'PUBLISHED'
      ? scheduleIdleTask(() => {
        setShowComments(true)
      }, 900)
      : () => {}

    const cancelTocTask = (!isMobile && headingCount >= 3)
      ? scheduleIdleTask(() => {
        setShowToc(true)
      }, 700)
      : () => {}

    return () => {
      cancelCommentTask()
      cancelTocTask()
    }
  }, [headingCount, isMobile, post?.content, post?.status])

  // 处理分享
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      notification.success({
        message: '成功',
        description: '链接已复制到剪贴板',
        duration: 3,
      })
    }).catch(() => {
      notification.error({
        message: '错误',
        description: '复制失败',
        duration: 5,
      })
    })
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 手势处理 - 右滑返回
  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const touchEnd = useRef<{ x: number, y: number } | null>(null)
  const minSwipeDistance = 100 // px

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return

    const distanceX = touchStart.current.x - touchEnd.current.x
    const distanceY = touchStart.current.y - touchEnd.current.y
    const isRightSwipe = distanceX < -minSwipeDistance

    // 确保是水平滑动主导（垂直位移较小）
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isRightSwipe) {
        navigate(-1)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '24rem' }}>
        <Spin size='large' />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message='加载失败'
        description={error.message}
        type='error'
        showIcon
        action={
          <LiquidButton size='small' onClick={() => refetch()} variant='secondary' className='!h-8 !px-3'>
            重试
          </LiquidButton>
        }
      />
    )
  }

  if (!post) {
    return (
      <div className='text-center py-12'>
        <Alert
          message='文章未找到'
          description='您访问的文章不存在或已被删除'
          type='warning'
          showIcon
          action={
            <Link to='/'>
              <LiquidButton variant='primary'>返回首页</LiquidButton>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <PageContainer
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className='!px-2'
    >
        <div style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: isMobile ? '1rem 0.25rem' : '3rem 0'
      }}
      >
        {/* React 19 Metadata Hoisting */}
        <title>{post?.title ? `${post.title} - 博客平台` : '加载中... - 博客平台'}</title>
        {post?.excerpt && <meta name='description' content={post.excerpt} />}

        <PageHeader
          label='文章'
          title={post.title}
          subtitle={post.excerpt}
          showThemeToggle
          actions={
            <LiquidButton
              onClick={() => navigate('/home')}
              variant='secondary'
              className='!h-10 !px-4 flex items-center gap-2'
            >
              <ArrowLeftOutlined /> 返回
            </LiquidButton>
          }
          extra={
            <div className='rounded-[28px] border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] px-5 py-5 shadow-[var(--shadow-md)] backdrop-blur-xl md:px-6'>
              <div className='flex flex-col gap-5'>
                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <Avatar
                      src={post.author.avatar}
                      icon={<UserOutlined />}
                      size='large'
                    />
                    <div className='min-w-0'>
                      <div className='text-sm md:text-base font-semibold text-[color:var(--surface-text)] truncate'>
                        {post.author.username}
                      </div>
                      <div className='flex items-center gap-1.5 text-xs md:text-sm text-[color:var(--surface-text-secondary)]'>
                        <CalendarOutlined />
                        <span>{post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                    {post.status !== 'PUBLISHED' && (
                      <span className='inline-flex h-8 items-center rounded-full border border-amber-300/60 bg-amber-100/80 px-3 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
                        草稿
                      </span>
                    )}
                  </div>

                  <div className='flex flex-wrap gap-2 md:justify-end'>
                    {isAuthenticated && user?.username === post.author.username && (
                      post.notionPageId
                        ? (
                          <Tooltip title='此文章由 Notion 同步，请在 Notion 中编辑'>
                            <LiquidButton
                              disabled
                              variant='secondary'
                              className={actionButtonClassName}
                            >
                              <CloudSyncOutlined /> Notion 同步
                            </LiquidButton>
                          </Tooltip>
                          )
                        : (
                          <Tooltip title='编辑文章'>
                            <LiquidButton
                              onClick={() => navigate(`/editor/posts/${post.slug}`)}
                              variant='secondary'
                              className={actionButtonClassName}
                            >
                              <EditOutlined /> 编辑
                            </LiquidButton>
                          </Tooltip>
                          )
                    )}

                    <Tooltip title={isLiked ? '取消点赞' : '点赞'}>
                      <LiquidButton
                        ref={likeButtonRef}
                        onClick={onLikeClick}
                        variant={isLiked ? 'primary' : 'secondary'}
                        disabled={!isAuthenticated}
                        className={actionButtonClassName}
                      >
                        <LikeOutlined /> 点赞 {likeCount}
                      </LiquidButton>
                    </Tooltip>

                    <Tooltip title='分享文章'>
                      <LiquidButton
                        onClick={handleShare}
                        variant='secondary'
                        className={actionButtonClassName}
                      >
                        <ShareAltOutlined /> 分享
                      </LiquidButton>
                    </Tooltip>
                  </div>
                </div>

                {tagWidths.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {tagWidths.map(({ tag, width }) => (
                      <span
                        key={tag}
                        className='inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-container)] px-3 text-sm font-semibold text-[color:var(--surface-text)]'
                        style={{ width }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className='flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--surface-text-secondary)]'>
                  <span className='inline-flex items-center gap-1.5'>
                    <EyeOutlined />
                    {post.stats?.viewCount || 0} 次浏览
                  </span>
                  <span className='inline-flex items-center gap-1.5'>
                    <LikeOutlined />
                    {likeCount} 次点赞
                  </span>
                  <span className='inline-flex items-center gap-1.5'>
                    <CommentOutlined />
                    {post.stats?.commentCount || 0} 条评论
                  </span>
                </div>
              </div>
            </div>
          }
        />

        {/* 主内容区：文章 + TOC */}
        <div style={{ display: 'flex', gap: '2rem', position: 'relative', alignItems: 'flex-start' }}>
          {/* 左侧主内容区 */}
          <div style={{ flex: '1', minWidth: 0 }}>
            {/* 文章内容容器 */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '0', // Reduced padding since no border bounds it
              }}
            >
              <Divider style={{ borderColor: 'var(--color-border)' }} />

              {/* 文章内容 */}
              <div style={{ maxWidth: '100%', color: 'var(--color-text)' }}>
                {post.content
                  ? (
                    <Suspense fallback={<div className='p-4 space-y-4'><Spin /></div>}>
                      <MarkdownViewer content={post.content} />
                    </Suspense>
                    )
                  : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
                      暂无内容
                    </div>
                    )}
              </div>
            </div>

            {/* 评论区 */}
            {post.status === 'PUBLISHED'
              ? (
                showComments
                  ? (
                    <Suspense fallback={<div className='py-6 text-center text-[color:var(--surface-text-secondary)]'>正在加载评论区...</div>}>
                      <CommentSection
                        blogPostId={post.id}
                        blogPostSlug={post.slug}
                      />
                    </Suspense>
                    )
                  : <div className='py-6 text-center text-[color:var(--surface-text-secondary)]'>评论区将在正文稳定后加载</div>
                )
              : (
                <Alert
                  message='评论功能已禁用'
                  description='草稿文章暂不支持评论功能。发布文章后即可开启评论。'
                  type='info'
                  showIcon
                  style={{ marginTop: '24px' }}
                />
                )}
          </div>

          {/* 右侧 TOC 侧边栏 */}
          {post.content && showToc && (
            <aside className='toc-sidebar'>
              <div className='toc-sticky'>
                <Suspense fallback={<div className='text-sm text-[color:var(--surface-text-secondary)]'>目录加载中...</div>}>
                  <TableOfContents content={post.content} />
                </Suspense>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* 返回顶部按钮 */}
      <BackToTop />
    </PageContainer>
  )
}
