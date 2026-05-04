import React, { useState, useEffect } from 'react'
import { Row, Col, Spin, Empty } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { PageHeader } from '@/components/PageHeader'
import { LiquidSearchBox } from '@/components/LiquidSearchBox'
import QuickRefTile from '@/components/QuickRefTile'
import { useBlogList } from '@/hooks'
import { shouldReduceEffects } from '@/utils/performance'

export default function QuickRefListPage () {
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'
  const reduceEffects = shouldReduceEffects()

  const { posts: apolloPosts, loading: apolloLoading, filterByTags, filterBySearch, loadMore, hasMore } = useBlogList(50)

  const [staticPosts, setStaticPosts] = useState<import('@/types').BlogPost[]>([])
  const [staticLoading, setStaticLoading] = useState(isStatic)

  // 加载静态数据
  useEffect(() => {
    if (isStatic) {
      setStaticLoading(true)
      fetch('./static/posts.json')
        .then(res => res.json())
        .then(data => {
          // 在本地进行标签过滤
          const filtered = data.filter((post: import('@/types').BlogPost) =>
            Array.isArray(post.tags) && post.tags.includes('QuickRef')
          )
          setStaticPosts(filtered)
          setStaticLoading(false)
        })
        .catch(() => setStaticLoading(false))
    } else {
      filterByTags(['QuickRef'])
    }
  }, [isStatic, filterByTags])

  const loading = isStatic ? staticLoading : apolloLoading
  const allPosts = isStatic ? staticPosts : apolloPosts

  // 静态模式下的搜索过滤
  const filteredPosts = isStatic
    ? allPosts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : allPosts

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    if (!isStatic) {
      filterBySearch(val)
    }
  }

  return (
    <PageContainer>
      <div className='py-8'>
        <PageHeader
          title='知识卡片'
          subtitle='开发速查表，记录常用代码与命令。'
          icon={<BookOutlined />}
          showThemeToggle
          extra={
            <div className='max-w-xl'>
              <LiquidSearchBox
                placeholder='搜索速查表...'
                value={searchTerm}
                onChange={handleSearch}
                onSearch={(value) => {
                  setSearchTerm(value)
                  if (!isStatic) {
                    filterBySearch(value)
                  }
                }}
                height={50}
                variant='search'
                className='w-full'
                inputClassName='text-base font-medium'
              />
            </div>
          }
        />

        {loading && filteredPosts.length === 0
          ? (
            <div className='flex justify-center py-20'><Spin size='large' /></div>
            )
          : filteredPosts.length === 0
            ? (
              <Empty description='暂无速查表数据' className='py-20' />
              )
            : (
              <>
                <Row gutter={[16, 16]}>
                  {filteredPosts.map((post, index) => (
                    <Col xs={12} sm={8} md={6} lg={4} key={post.id}>
                      <div
                        className={`h-full transition-transform duration-200 ${reduceEffects ? '' : 'hover:-translate-y-1'}`}
                        style={reduceEffects
                          ? undefined
                          : {
                              animation: 'fadeIn 240ms ease-out forwards',
                              animationDelay: `${(index % 20) * 20}ms`,
                              opacity: 0,
                            }}
                      >
                        <QuickRefTile
                          title={post.title}
                          onClick={() => navigate(`/post/${post.slug}`)}
                        />
                      </div>
                    </Col>
                  ))}
                </Row>

                {hasMore && !isStatic && (
                  <div className='mt-12 text-center'>
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className='px-8 py-3 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-[color:var(--surface-text)] backdrop-blur-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium hover:bg-[color:var(--surface-container)] hover:scale-[1.02] active:scale-[0.98]'
                    >
                      {loading ? '加载中...' : '查看更多'}
                    </button>
                  </div>
                )}
              </>
              )}
      </div>
    </PageContainer>
  )
}
