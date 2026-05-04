import React, { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import {
  Select,
  List,
  Spin,
  Alert,
  Typography,
  Space,
  Row,
  Col,
  Collapse,
  DatePicker,
  Slider,
  Drawer,
  Empty,
  Grid
} from 'antd'
// ... rest of imports
import { LiquidButton } from '@/components/LiquidButton'
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  LikeOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import {
  useTrendingSearchesHook,
  useEnhancedSearchHook
} from '@/hooks'
import type { SearchFilters, SearchSortBy } from '@/types'
import dayjs from 'dayjs'
import { ThemeContext } from '@/components/ThemeProvider'
import { measureInlineLabelWidth } from '@/utils/pretextMetrics'
import { usePretextClamp } from '@/hooks/usePretextMetrics'
import { scheduleIdleTask } from '@/utils/performance'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

import { LiquidSearchBox } from '@/components/LiquidSearchBox'
import { PageHeader } from '@/components/PageHeader'
import { PageContainer } from '@/components/PageContainer'
import ThemeToggleButton from '@/components/ThemeToggleButton'

const SearchChipButton = ({
  label,
  onClick,
  width,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  onClick: () => void;
  width?: number;
  tone?: 'neutral' | 'hot' | 'warm';
  compact?: boolean;
}) => {
  const toneClassName = tone === 'hot'
    ? 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300'
    : tone === 'warm'
      ? 'border-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-300'
      : 'border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-[color:var(--surface-text-secondary)]'

  return (
    <button
      type='button'
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border px-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary-soft)] hover:text-[color:var(--surface-text)] ${
        compact ? 'h-7 text-[10px] font-semibold' : 'h-9 text-xs font-medium backdrop-blur-xl'
      } ${toneClassName}`}
      style={width ? { width } : undefined}
    >
      {label}
    </button>
  )
}

const SearchSidebarPanel = ({
  title,
  extra,
  children,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className='rounded-[28px] border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] p-5 shadow-[var(--shadow-md)] backdrop-blur-xl'>
    <div className='mb-4 flex items-center justify-between gap-3'>
      <div className='text-sm font-semibold text-[color:var(--surface-text)]'>{title}</div>
      {extra}
    </div>
    {children}
  </section>
)

const SearchResultCard = React.memo(({ post }: { post: Record<string, unknown> }) => {
  const title = String(post.title || '')
  const excerpt = String(post.excerpt || '')
  const titleMetrics = usePretextClamp<HTMLHeadingElement>({
    text: title,
    font: '700 30px Inter',
    lineHeight: 38,
    maxLines: 2,
  })
  const excerptMetrics = usePretextClamp<HTMLParagraphElement>({
    text: excerpt,
    font: '400 16px Inter',
    lineHeight: 26,
    maxLines: 3,
  })

  return (
    <article className='rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] p-5 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg md:p-6'>
      <div className='flex flex-col md:flex-row gap-6'>
        {post.coverImageUrl
          ? (
            <div className='w-full md:w-48 lg:w-64 h-48 md:h-auto overflow-hidden rounded-2xl'>
              <img
                src={post.coverImageUrl as string}
                alt={title}
                loading='lazy'
                decoding='async'
                className='w-full h-full object-cover'
              />
            </div>
            )
          : null}
        <div className='flex-1 flex flex-col justify-between py-1 min-w-0'>
          <div>
            <Link to={`/post/${post.slug}`}>
              <h2
                ref={titleMetrics.ref}
                className='mb-3 text-xl font-bold leading-tight text-[color:var(--surface-text)] transition-colors hover:text-[color:var(--color-primary)] md:text-2xl line-clamp-2'
                style={{ minHeight: titleMetrics.clampedHeight || undefined }}
              >
                {title}
              </h2>
            </Link>

            {excerpt
              ? (
                <p
                  ref={excerptMetrics.ref}
                  className='mb-4 text-sm leading-relaxed text-[color:var(--surface-text-secondary)] md:text-base line-clamp-3'
                  style={{ minHeight: excerptMetrics.clampedHeight || undefined }}
                >
                  {excerpt}
                </p>
                )
              : null}

            <div className='flex flex-wrap gap-2 mb-4'>
              {(post.tags as string[])?.map((tag: string, index: number) => (
                <span
                  key={index}
                  className='inline-flex h-8 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-container)] px-3 text-xs font-medium text-[color:var(--surface-text-secondary)]'
                  style={{ width: measureInlineLabelWidth({ text: `#${tag}`, font: '500 12px Inter', chromeWidth: 24, minWidth: 52, maxWidth: 180 }) }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className='flex items-center justify-between border-t border-[color:var(--surface-border)] pt-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-primary-soft)]/20 text-[color:var(--color-primary)] font-bold text-xs'>
                {String(((post.author as Record<string, unknown>)?.username || 'U')).charAt(0).toUpperCase()}
              </div>
              <div className='flex flex-col'>
                <Text className='text-xs font-medium'>{((post.author as Record<string, unknown>)?.username as string) || 'Unknown'}</Text>
                {!!post.publishedAt && <Text className='text-[10px] text-[color:var(--surface-text-muted)]'>{dayjs(post.publishedAt as string).format('MMM D, YYYY')}</Text>}
              </div>
            </div>

            <Space size={16} className='text-[color:var(--surface-text-muted)]'>
              <span className='flex items-center gap-1.5 text-xs'>
                <EyeOutlined /> {String((post.stats as Record<string, unknown>)?.viewCount ?? 0)}
              </span>
              <span className='flex items-center gap-1.5 text-xs'>
                <LikeOutlined /> {String((post.stats as Record<string, unknown>)?.likeCount ?? 0)}
              </span>
            </Space>
          </div>
        </div>
      </div>
    </article>
  )
})

const SearchPage: React.FC = () => {
  const { theme } = useContext(ThemeContext)
  const isDarkMode = theme === 'dark'
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [searchQuery, setSearchQuery] = useState('')
  // ... rest of state
  const [filters, setFilters] = useState<SearchFilters>({})
  const [sortBy, setSortBy] = useState<SearchSortBy>('RELEVANCE')
  const [limit] = useState(10)
  const [offset, setOffset] = useState(0)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [trendingReady, setTrendingReady] = useState(false)

  // ... (keeping existing logic)
  // 使用增强搜索功能
  const { results: enhancedResults, loading: enhancedLoading, search: performEnhancedSearch, error: enhancedError } = useEnhancedSearchHook()

  // 使用热门搜索词
  const { trendingSearches, loading: trendingLoading } = useTrendingSearchesHook(10, { enabled: trendingReady })

  // 本地状态用于搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('blog_search_history')
    return saved ? JSON.parse(saved) : []
  })

  // 添加防抖计时器引用
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 处理搜索 - 只在用户点击搜索按钮时触发
  const handleSearch = useCallback(async (query: string) => {
    const currentQuery = query || searchQuery
    if (!currentQuery.trim()) return

    setHasSearched(true)

    try {
      await performEnhancedSearch({
        query: currentQuery,
        limit,
        offset,
        filters,
        sortBy
      })

      // 添加到搜索历史
      setSearchHistory(prevHistory => {
        const newHistory = [currentQuery, ...prevHistory.filter(h => h !== currentQuery)].slice(0, 10)
        localStorage.setItem('blog_search_history', JSON.stringify(newHistory))
        return newHistory
      })

      // 搜索后可以自动关闭抽屉
      setIsFilterDrawerOpen(false)
    } catch { /* empty */ }
  }, [searchQuery, limit, offset, filters, sortBy, performEnhancedSearch])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const handleFilterChange = (filterType: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const handleDateRangeChange = (dates: unknown, dateStrings: [string, string]) => {
    if (dates) {
      handleFilterChange('dateFrom', dateStrings[0])
      handleFilterChange('dateTo', dateStrings[1])
    } else {
      handleFilterChange('dateFrom', undefined)
      handleFilterChange('dateTo', undefined)
    }
  }

  const resetFilters = () => {
    setFilters({})
    setSortBy('RELEVANCE')
    if (!searchQuery.trim()) {
      setHasSearched(false)
    }
  }

  const handleTrendingSearch = useCallback((query: string) => {
    setSearchQuery(query)
    handleSearch(query)
  }, [handleSearch])

  const handleHistorySearch = useCallback((query: string) => {
    setSearchQuery(query)
    handleSearch(query)
  }, [handleSearch])

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([])
    localStorage.removeItem('blog_search_history')
  }, [])

  useEffect(() => {
    const timeout = searchTimeoutRef.current
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  useEffect(() => {
    const cancelIdleTask = scheduleIdleTask(() => {
      setTrendingReady(true)
    }, 1200)

    return () => cancelIdleTask()
  }, [])

  const headerActions = useMemo(() => (
    <>
      <div className='md:hidden'>
        <ThemeToggleButton useLiquid={false} />
      </div>
      <LiquidButton
        variant='secondary'
        className='md:hidden !rounded-full flex items-center gap-2 !h-10 px-5 shadow-sm border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-[color:var(--surface-text)] backdrop-blur-md'
        onClick={() => setIsFilterDrawerOpen(true)}
      >
        <FilterOutlined /> 筛选选项
      </LiquidButton>
    </>
  ), [])

  const renderFilterContent = () => (
    <div className='flex flex-col gap-6'>
      <Collapse
        defaultActiveKey={['1', '2', '3']}
        ghost
        expandIconPosition='end'
        items={[{
          key: '1',
          label: <Text className='font-bold'>排序方式</Text>,
          children: (
            <Select
              value={sortBy}
              onChange={setSortBy}
              className='w-full'
            >
              <Option value='RELEVANCE'>相关性优先</Option>
              <Option value='CREATED_AT'>最新创建</Option>
              <Option value='UPDATED_AT'>最近更新</Option>
              <Option value='VIEW_COUNT'>热度优先 (浏览)</Option>
              <Option value='LIKE_COUNT'>热度优先 (点赞)</Option>
            </Select>
          )
        }, {
          key: '2',
          label: <Text className='font-bold'>日期范围</Text>,
          children: (
            <RangePicker
              className='w-full'
              onChange={handleDateRangeChange}
              placeholder={['开始日期', '结束日期']}
            />
          )
        }, {
          key: '3',
          label: <Text className='font-bold'>浏览量筛选</Text>,
          children: (
            <div className='px-2'>
              <Slider
                min={0}
                max={1000}
                step={10}
                value={filters.minViews as number}
                onChange={(value) => handleFilterChange('minViews', value)}
                tooltip={{ formatter: (value) => `${value} 次浏览` }}
              />
              <div className='flex justify-between text-[10px] text-[color:var(--surface-text-muted)]'>
                <span>0</span>
                <span>1000+</span>
              </div>
            </div>
          )
        }, {
          key: '4',
          label: <Text className='font-bold'>点赞数筛选</Text>,
          children: (
            <div className='px-2'>
              <Slider
                min={0}
                max={100}
                step={1}
                value={filters.minLikes as number}
                onChange={(value) => handleFilterChange('minLikes', value)}
                tooltip={{ formatter: (value) => `${value} 个点赞` }}
              />
              <div className='flex justify-between text-[10px] text-[color:var(--surface-text-muted)]'>
                <span>0</span>
                <span>100+</span>
              </div>
            </div>
          )
        }]}
      />

      <LiquidButton
        variant='danger'
        onClick={resetFilters}
        className='w-full !rounded-full !h-10 flex items-center justify-center gap-2'
      >
        <CloseOutlined /> 重置所有筛选
      </LiquidButton>
    </div>
  )

  return (
    <PageContainer className='pb-32'>

      <PageHeader
        title='全局搜索'
        icon={<SearchOutlined />}
        actions={headerActions}
        extra={
          <div className='sticky top-4 z-20'>
            <LiquidSearchBox
              placeholder='输入关键词，开启液态化搜索体验...'
              value={searchQuery}
              onChange={handleSearchChange}
              onSearch={() => handleSearch(searchQuery)}
              height={isMobile ? 50 : 60}
              width={isMobile ? '100% ' : '100%'}
              variant='search'
              className='w-full shadow-lg'
              inputClassName={isMobile ? 'text-base font-medium' : 'text-base md:text-xl font-semibold'}
            />
          </div>
        }
      />

      <Row gutter={[24, 24]}>
        {/* DESKTOP SIDEBAR */}
        <Col xs={0} lg={6}>
          <SearchSidebarPanel title={<Space><FilterOutlined className='text-[color:var(--color-primary)]' /> 高级筛选</Space>}>
            {renderFilterContent()}
          </SearchSidebarPanel>

          {/* HISTORY & TRENDING */}
          <div className='space-y-6'>
            {searchHistory.length > 0 && (
              <SearchSidebarPanel
                title='最近搜索'
                extra={<LiquidButton variant='ghost' className='!h-auto !p-0 text-[10px] text-[color:var(--surface-text-tertiary)] hover:text-red-400' onClick={clearSearchHistory}>清除</LiquidButton>}
              >
                <div className='flex flex-wrap gap-2'>
                  {searchHistory.map((history, index) => (
                    <SearchChipButton key={index} label={history} onClick={() => handleHistorySearch(history)} />
                  ))}
                </div>
              </SearchSidebarPanel>
            )}

            {!trendingLoading && (
              <SearchSidebarPanel title='热门趋势'>
                <div className='flex flex-wrap gap-2'>
                  {(trendingSearches || []).map((term, index) => (
                    <SearchChipButton key={index} label={term} onClick={() => handleTrendingSearch(term)} tone={index < 3 ? 'hot' : 'warm'} />
                  ))}
                </div>
              </SearchSidebarPanel>
            )}
          </div>
        </Col>

        {/* SEARCH RESULTS */}
        <Col xs={24} lg={18}>
          {enhancedLoading
            ? (
              <div className='flex flex-col items-center justify-center py-32 space-y-4'>
                <Spin size='large' />
                <Text type='secondary' className='animate-pulse'>正在深度挖掘相关内容...</Text>
              </div>
              )
            : enhancedError
              ? (
                <div className='py-24 flex flex-col items-center justify-center rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-container)] backdrop-blur-xl text-center px-6'>
                  <Alert
                    message='搜索服务暂不可用'
                    description={enhancedError.message}
                    type='error'
                    showIcon
                    className='mb-6 rounded-xl w-full max-w-2xl text-left'
                  />
                  <Text type='secondary' className='block mb-5'>
                    请确认本地后端服务已启动，或稍后重试。
                  </Text>
                  <LiquidButton variant='primary' onClick={() => handleSearch(searchQuery)}>
                    重新搜索
                  </LiquidButton>
                </div>
                )
            : enhancedResults && enhancedResults.total > 0
              ? (
                <div className='space-y-6'>
                  <div className='px-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-2'>
                    <Text className='text-[color:var(--surface-text-muted)] text-xs'>
                      共找到 <span className='font-bold text-[color:var(--surface-text)]'>{enhancedResults.total}</span> 篇匹配结果，耗时 {enhancedResults.took}
                    </Text>

                    {enhancedResults.suggestions && enhancedResults.suggestions.length > 0 && (
                      <div className='flex items-center gap-2'>
                        <Text type='secondary' className='text-xs'>你是不是在找: </Text>
                        {enhancedResults.suggestions.map((suggestion, index) => (
                          <SearchChipButton
                            key={index}
                            label={suggestion}
                            onClick={() => handleTrendingSearch(suggestion)}
                            tone='warm'
                            compact
                            width={measureInlineLabelWidth({ text: suggestion, font: '600 10px Inter', chromeWidth: 28, minWidth: 56, maxWidth: 220 })}
                          />
                        ))}
                        <div className='flex justify-center mt-6'>
                          <LiquidButton variant='primary' onClick={() => handleSearch(searchQuery)}>重新加载</LiquidButton>
                        </div>
                      </div>
                    )}
                  </div>

                  <List
                    dataSource={enhancedResults.posts}
                    grid={{ gutter: 24, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 }}
                    renderItem={(post: Record<string, unknown>) => (
                      <List.Item className='!mb-6'>
                        <SearchResultCard post={post} />
                      </List.Item>
                    )}
                    pagination={{
                      current: Math.floor(offset / limit) + 1,
                      pageSize: limit,
                      total: enhancedResults.total,
                      className: 'pt-8 !text-center',
                      onChange: (page) => {
                        const newOffset = (page - 1) * limit
                        setOffset(newOffset)
                        if (searchQuery.trim()) {
                          performEnhancedSearch({ query: searchQuery, limit, offset: newOffset, filters, sortBy })
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      },
                    }}
                  />
                </div>
                )
              : hasSearched
                ? (
                <div className='py-32 flex flex-col items-center justify-center rounded-3xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-container)] backdrop-blur-xl'>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div className='space-y-4'>
                        <Text type='secondary' className='text-lg block'>找不到匹配的文章</Text>
                        <LiquidButton variant='primary' className='!rounded-full px-8' onClick={resetFilters}>清除所有筛选再试</LiquidButton>
                      </div>
                  }
                  />
                </div>
                  )
                : (
                <div className='py-32 flex flex-col items-center justify-center rounded-3xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-container)] text-center px-6'>
                  <Text className='text-lg md:text-xl font-semibold text-[color:var(--surface-text)] block mb-3'>
                    输入关键词开始搜索
                  </Text>
                  <Text type='secondary' className='max-w-lg'>
                    你可以搜索文章标题、摘要、标签或热门主题，结果会在这里显示。
                  </Text>
                </div>
                )}
        </Col>
      </Row>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        title={<span className='font-bold text-lg dark:text-white'>高级筛选</span>}
        placement='bottom'
        height='75vh'
        onClose={() => setIsFilterDrawerOpen(false)}
        open={isFilterDrawerOpen}
        className='rounded-t-[32px] overflow-hidden'
        styles={{
          mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.3)' },
          content: {
            background: isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
          },
          body: { padding: '24px 20px' }
        }}
      >
        {renderFilterContent()}

        <div className='mt-12 space-y-8'>
          {searchHistory.length > 0 && (
            <div>
              <Title level={5} className='mb-4'>最近搜索词</Title>
              <div className='flex flex-wrap gap-2'>
                {searchHistory.map((history, index) => (
                  <SearchChipButton
                    key={index}
                    label={history}
                    onClick={() => handleHistorySearch(history)}
                    width={measureInlineLabelWidth({ text: history, font: '500 12px Inter', chromeWidth: 30, minWidth: 68, maxWidth: 220 })}
                  />
                ))}
              </div>
            </div>
          )}

          {!trendingLoading && (
            <div>
              <Title level={5} className='mb-4'>热门趋势</Title>
              <div className='flex flex-wrap gap-2'>
                {(trendingSearches || []).map((term, index) => (
                  <SearchChipButton
                    key={index}
                    label={term}
                    onClick={() => handleTrendingSearch(term)}
                    tone={index < 3 ? 'hot' : 'warm'}
                    width={measureInlineLabelWidth({ text: term, font: '500 12px Inter', chromeWidth: 30, minWidth: 68, maxWidth: 220 })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </PageContainer>
  )
}

export default SearchPage
