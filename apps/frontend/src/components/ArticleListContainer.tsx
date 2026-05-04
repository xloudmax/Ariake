import React from 'react'
import { Typography, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'
import { BlogPost } from '../types'
import ArticleCard from './ArticleCard'
import { motion } from 'framer-motion'
import { shouldReduceEffects } from '@/utils/performance'

const { Text, Title } = Typography

interface ArticleListContainerProps {
  posts: BlogPost[];
  loading: boolean;
  error?: Error;
  onAction?: (action: string, post: BlogPost) => void;
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

const ArticleListContainer: React.FC<ArticleListContainerProps> = ({
  posts,
  loading,
  error,
  onAction
}) => {
  const navigate = useNavigate()
  const reduceEffects = shouldReduceEffects()

  const handleNavigate = (slug: string) => {
    navigate(`/post/${slug}`)
  }

  const handlePostAction = (action: string, post: BlogPost) => {
    if (onAction) {
      onAction(action, post)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--color-primary)]' />
        <Text className='ml-3 text-lg text-[color:var(--surface-text-muted)]'>加载中...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-center py-16'>
        <Alert
          message='加载失败'
          description={error.message}
          type='error'
          showIcon
        />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className='text-center py-16'>
        <Title level={3} className='mb-4 font-normal text-[color:var(--surface-text-muted)]'>
          还没有文章
        </Title>
      </div>
    )
  }

  // 动态计算网格布局
  const getGridClass = () => {
    const baseClasses = '!gap-y-6 md:!gap-y-8 !gap-x-6 md:!gap-x-8 lg:!gap-x-[30px] pb-12'

    // 只有1篇文章时，居中显示，不留白
    if (posts.length === 1) {
      return `grid grid-cols-1 max-w-3xl mx-auto ${baseClasses}`
    }

    // 只有2篇文章时，使用双列布局
    if (posts.length === 2) {
      return `grid grid-cols-1 md:grid-cols-2 ${baseClasses}`
    }

    // 3篇及以上，使用三列布局
    return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${baseClasses}`
  }

  return (
    <div className={getGridClass()}>
      {posts.map((post) => (
        reduceEffects
          ? (
            <div key={post.id}>
              <ArticleCard
                post={post}
                onNavigate={handleNavigate}
                onAction={handlePostAction}
              />
            </div>
            )
          : (
            <motion.div
              key={post.id}
              variants={item}
              initial='hidden'
              whileInView='show'
              viewport={{ once: true, margin: '-50px' }}
            >
              <ArticleCard
                post={post}
                onNavigate={handleNavigate}
                onAction={handlePostAction}
              />
            </motion.div>
            )
      ))}
    </div>
  )
}

export default ArticleListContainer
