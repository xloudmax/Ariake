import { useMemo, useRef, useEffect, useState, Suspense, lazy } from 'react'
import { Typography } from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import { useNavigate } from 'react-router-dom'

import { useBlogList, useBlogDashboard } from '@/hooks'
import type { PostFilter, BlogPost } from '@/types'
import { PostStatus, type PostSortInput } from '@/generated/graphql'
import ArticleListContainer from '@/components/ArticleListContainer'

import SearchAndFilter from '@/components/SearchAndFilter'
import ArticleSkeleton from '@/components/ArticleSkeleton'
import HeroSkeleton from '@/components/HeroSkeleton'
import ActiveFilters from '@/components/ActiveFilters'
import { PageHeader } from '@/components/PageHeader'
import { PageContainer } from '@/components/PageContainer'
import { scheduleIdleTask } from '@/utils/performance'

const HeroCarousel = lazy(() => import('@/components/HeroCarousel'))

const { Text, Title } = Typography

export default function HomePage () {
  const navigate = useNavigate()
  const observerTarget = useRef<HTMLDivElement>(null)
  const [dashboardReady, setDashboardReady] = useState(false)

  // 博客列表管理 - 使用服务端过滤和分页
  const {
    posts,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    filter,
    sort,
    setSort,
    filterBySearch,
    filterByTags,
    filterByStatus,
    clearFilters
  } = useBlogList()

  // 获取热门标签（带计数）
  const { tags: trendingTags } = useBlogDashboard({ enabled: dashboardReady })

  // 适配 SearchAndFilter 的 allTags (只传名称)
  const allTags = useMemo(() => (trendingTags || []).map(t => typeof t === 'string' ? t : t.name), [trendingTags])

  // 处理搜索
  const handleSearch = (query: string) => {
    filterBySearch(query)
  }

  // 处理筛选
  const handleFilter = (newFilters: PostFilter) => {
    if (newFilters.tags !== undefined) {
      filterByTags(newFilters.tags)
    }
    if (newFilters.status) {
      filterByStatus(newFilters.status as unknown as PostStatus)
    }
  }

  // 处理排序
  const handleSort = (newSort: PostSortInput) => {
    setSort(newSort)
  }

  // 处理文章操作
  const handlePostAction = (action: string, post: BlogPost) => {
    if (action === 'view') {
      navigate(`/post/${post.slug}`)
    } else if (action === 'edit') {
      navigate(`/editor/posts/${post.slug}`)
    } else if (action === 'share') {
      const url = `${window.location.origin}/post/${post.slug}`
      if (navigator.share) {
        navigator.share({
          title: post.title,
          text: post.excerpt || '',
          url,
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error)
        })
      } else {
        navigator.clipboard.writeText(url).catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error)
        })
      }
    }
  }

  // 是否正在进行初始加载（没有数据且正在加载）
  const isInitialLoading = loading && posts.length === 0

  const today = new Date()
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(today)
  const dateTitle = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(today).replace(/\s/g, '')

  // 无限滚动监听
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loading, loadMore, hasMore])

  // Detect iOS for conditional UI
  const isIOS = useMemo(() =>
    typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  , [])

  useEffect(() => {
    const cancelIdleTask = scheduleIdleTask(() => {
      setDashboardReady(true)
    }, 900)

    return () => cancelIdleTask()
  }, [])

  return (
    <div className='min-h-screen'>
      {/* Background is handled globally by AppLayout transparent content */}

      <PageContainer className='pt-2 pb-8'>

        <PageHeader
          title={dateTitle || '今日阅读'}
          label={dateLabel || 'Today'}
          className='border-b border-[color:var(--surface-border)] pb-4 md:pb-5'
          extra={
            <div className='flex flex-col gap-3 md:gap-4'>
              <SearchAndFilter
                onSearch={handleSearch}
                onFilter={handleFilter}
                activeFilters={filter as PostFilter}
                activeSort={sort}
                onSort={handleSort}
                onClearFilters={clearFilters}
                allTags={allTags}
                showThemeToggle
                className='w-full md:w-80 lg:w-96'
              />
              <ActiveFilters
                activeFilters={filter as PostFilter}
                onFilterChange={handleFilter}
                onClearFilters={clearFilters}
                className='!mt-0 !mb-0 justify-start md:justify-end pb-1 overflow-x-auto no-scrollbar'
              />
            </div>
          }
        />

        {/* HERO SECTION - Hidden on iOS as requested */}
        {!isIOS && (
          <>
            {isInitialLoading
              ? (
                <HeroSkeleton />
                )
              : !error && posts.length > 0 && (
                <div className='mb-8 animate-fade-in-up' style={{ animationDelay: '0.1s' }}>
                  <Suspense fallback={<HeroSkeleton />}>
                    <HeroCarousel
                      posts={posts.slice(0, 3)}
                      onNavigate={(slug) => handlePostAction('view', { slug } as BlogPost)}
                    />
                  </Suspense>
                </div>
                )}
          </>
        )}

        {/* REMAINING POSTS GRID */}
        {isInitialLoading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {[...Array(6)].map((_, index) => (
              <ArticleSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className='text-center py-10 glassy-card rounded-2xl animate-fade-in-up border border-[color:var(--surface-border)]'>
            <Title level={4} className='!mb-2 !text-[color:var(--surface-text)]'>文章服务暂不可用</Title>
            <Text className='text-[color:var(--surface-text-secondary)] block mb-2'>请确认本地后端服务已启动，或稍后重试。</Text>
            <Text className='text-red-500 block mb-4 text-sm'>{error.message}</Text>
            <div className='flex justify-center mt-6'>
              <LiquidButton variant='primary' onClick={() => refetch()}>重新加载</LiquidButton>
            </div>
          </div>
        ) : (
          <>
            <div className='animate-fade-in-up' style={{ animationDelay: '0.4s' }}>
              {/* Spacer between Hero and Grid */}
              {!isIOS && <div className='w-full h-4' />}

              {(isIOS ? posts : posts.slice(3)).length > 0
                ? (
                  <ArticleListContainer
                    posts={isIOS ? posts : posts.slice(3)}
                    loading={false}
                    error={undefined}
                    onAction={handlePostAction}
                  />
                  )
                : posts.length === 0
                  ? (
                    <ArticleListContainer
                      posts={[]}
                      loading={false}
                      error={undefined}
                    />
                    )
                  : null}
            </div>

            {/* Infinite Scroll Sentinel */}
            {!isInitialLoading && !error && (
              <div ref={observerTarget} className='mt-8 py-8 flex justify-center w-full min-h-[50px]'>
                {!loading && !hasMore && posts.length > 0 && (
                  <div className='text-[color:var(--surface-text-tertiary)] italic'>No more posts</div>
                )}
              </div>
            )}
          </>
        )}

      </PageContainer>
    </div>
  )
}
