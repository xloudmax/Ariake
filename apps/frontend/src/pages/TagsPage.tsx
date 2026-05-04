import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, Empty, Spin, Space, Typography, Grid } from 'antd'
import { TagOutlined, FolderOutlined } from '@ant-design/icons'
import { useGetTagsQuery, useGetCategoriesQuery } from '@/generated/graphql'
import { useBlogDashboard, useEnhancedSearchHook } from '@/hooks'
import { LiquidSearchBox } from '@/components/LiquidSearchBox'
import { PageHeader } from '@/components/PageHeader'
import { PageContainer } from '@/components/PageContainer'
import ArticleCard from '@/components/ArticleCard'
import { BlogPost } from '@/types'
import ThemeToggleButton from '@/components/ThemeToggleButton'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function TagsPage () {
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'
  const [activeTab, setActiveTab] = useState<string>('tags')
  const [searchText, setSearchText] = useState<string>('')

  // Articles search hook
  const { search, results: searchResults, loading: searchLoading } = useEnhancedSearchHook()

  // Keep a stable ref to `search` so the effect below doesn't re-fire when the
  // Apollo-backed function identity changes on every render (infinite loop guard).
  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  })

  // Trigger search when text changes
  useEffect(() => {
    searchRef.current({ query: searchText, limit: 12 })
  }, [searchText])

  // 动态模式使用 Apollo 自动生成的 Query
  const { data: tagsData, loading: tagsLoading } = useGetTagsQuery({
    variables: { limit: 100, search: searchText || undefined },
    skip: isStatic
  })

  const { data: categoriesData, loading: categoriesLoading } = useGetCategoriesQuery({
    variables: { limit: 100, search: searchText || undefined },
    skip: isStatic
  })

  // 静态模式使用 useBlogDashboard 提供的本地数据
  const { tags: staticTags } = useBlogDashboard()

  const apolloTags = tagsData?.getTags || []
  const rawTags = isStatic ? staticTags : apolloTags

  // 统一数据格式并应用本地搜索过滤
  interface TagItem { name: string; count: number; }
  const tags = (rawTags as (TagItem | string)[])
    .map(t => typeof t === 'string' ? { name: t, count: 0 } : t)
    .filter(t => t.name.toLowerCase().includes(searchText.toLowerCase()))

  const categories = isStatic
    ? [] // 目前静态导出暂不支持独立分类列表，若需要可后续扩展 dashboard.json
    : (categoriesData?.getCategories || [])

  // 处理标签点击
  const handleTagClick = (name: string) => {
    navigate(`/search?tag=${encodeURIComponent(name)}`)
  }

  // 处理分类点击
  const handleCategoryClick = (name: string) => {
    navigate(`/search?category=${encodeURIComponent(name)}`)
  }

  // Rendering articles
  const renderArticles = () => {
    if (searchLoading) {
      return (
        <div style={{ textAlign: 'center', padding: isMobile ? '1.5rem' : '3rem' }}>
          <Spin size='large' />
        </div>
      )
    }

    const posts = searchResults?.posts || []

    if (posts.length === 0) {
      return (
        <Empty
          description={searchText ? '没有找到匹配的文章' : '请输入搜索内容'}
          style={{ padding: isMobile ? '1.5rem' : '3rem' }}
        />
      )
    }

    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in'>
        {(posts as unknown as BlogPost[]).map((post: BlogPost) => (
          <ArticleCard
            key={post.id}
            post={post}
            onNavigate={(slug) => navigate(`/post/${slug}`)}
          />
        ))}
      </div>
    )
  }

  // 渲染标签列表
  const renderTags = () => {
    if (tagsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: isMobile ? '1.5rem' : '3rem' }}>
          <Spin size='large' />
        </div>
      )
    }

    if (tags.length === 0) {
      return (
        <Empty
          description={searchText ? '没有找到匹配的标签' : '暂无标签'}
          style={{ padding: isMobile ? '1.5rem' : '3rem' }}
        />
      )
    }

    return (
      <div className={isMobile ? 'px-2 py-2' : 'px-6 py-6'}>
        <Space size={isMobile ? [8, 8] : [16, 16]} wrap>
          {tags.map((tag) => (
            <button
              key={tag.name}
              type='button'
              onClick={() => handleTagClick(tag.name)}
              className={`inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-[color:var(--surface-text)] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary-soft)] hover:shadow-md ${
                isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'
              }`}
            >
              <TagOutlined className='mr-2 text-[color:var(--color-primary)]' />
              {tag.name}
              <span className={`ml-2 opacity-60 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                ({tag.count})
              </span>
            </button>
          ))}
        </Space>
      </div>
    )
  }

  // 渲染分类列表
  const renderCategories = () => {
    if (categoriesLoading) {
      return (
        <div style={{ textAlign: 'center', padding: isMobile ? '1.5rem' : '3rem' }}>
          <Spin size='large' />
        </div>
      )
    }

    if (categories.length === 0) {
      return (
        <Empty
          description={searchText ? '没有找到匹配的分类' : '暂无分类'}
          style={{ padding: isMobile ? '1.5rem' : '3rem' }}
        />
      )
    }

    return (
      <div className={isMobile ? 'px-2 py-2' : 'px-6 py-6'}>
        <div
          className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4'}`}
        >
          {categories.map((category) => (
            <button
              key={category.name}
              type='button'
              onClick={() => handleCategoryClick(category.name)}
              className={`w-full rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-left shadow-[var(--shadow-md)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary-soft)] ${
                isMobile ? 'p-4' : 'p-6'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-container)]'>
                  <FolderOutlined className={`${isMobile ? 'text-xl' : 'text-2xl'} text-[color:var(--color-primary)]`} />
                </div>
                <div className='flex-1'>
                  <Text strong className={`block text-[color:var(--surface-text)] ${isMobile ? 'text-[15px]' : 'text-base'}`}>
                    {category.name}
                  </Text>
                  <Text className={`text-[color:var(--surface-text-secondary)] ${isMobile ? 'text-[13px]' : 'text-sm'}`}>
                    {category.count} 篇文章
                  </Text>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title='标签与分类'
        icon={<TagOutlined />}
        actions={<ThemeToggleButton useLiquid={false} />}
        extra={
          <div style={{
            marginBottom: isMobile ? '1rem' : '1.5rem',
            padding: isMobile ? '0 0.5rem' : 0
          }}
          >
            <LiquidSearchBox
              placeholder={activeTab === 'tags' ? '搜索标签...' : '搜索分类...'}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              width={isMobile ? '100%' : 500}
              height={isMobile ? 44 : 50}
              variant='search'
              inputClassName={isMobile ? 'text-base' : ''}
            />
          </div>
        }
      />

      {/* 标签和分类标签页 */}
      <div style={{ padding: isMobile ? '0' : '0' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered={isMobile}
          items={[
            {
              key: 'articles',
              label: (
                <span>
                  文章 ({searchResults?.posts?.length ?? 0})
                </span>
              ),
              children: renderArticles(),
            },
            {
              key: 'tags',
              label: (
                <span>
                  <TagOutlined /> 标签 ({tags.length})
                </span>
              ),
              children: renderTags(),
            },
            {
              key: 'categories',
              label: (
                <span>
                  <FolderOutlined /> 分类 ({categories.length})
                </span>
              ),
              children: renderCategories(),
            },
          ]}
        />
      </div>

      <style>{`
        .ant-tabs-nav {
          margin-bottom: ${isMobile ? '8px' : '16px'} !important;
        }
      `}
      </style>
    </PageContainer>
  )
}
