import React from 'react'
import { Avatar } from 'antd'
import {
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { BlogPost } from '@/types'
import { getGradientByString } from '@/utils/gradients'

import { motion } from 'framer-motion'
import { useApolloClient } from '@apollo/client'
import { POST_QUERY } from '@/api/graphql/blog'
import { usePretextClamp } from '@/hooks/usePretextMetrics'
import { canPrefetchOnHover, shouldReduceEffects } from '@/utils/performance'

interface ArticleCardProps {
  post: BlogPost;
  onNavigate: (slug: string) => void;
  onAction?: (action: 'view' | 'edit' | 'share', post: BlogPost) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ post, onNavigate }) => {
  const client = useApolloClient()
  const titleMetrics = usePretextClamp<HTMLHeadingElement>({
    text: post.title,
    font: '800 28px Inter',
    lineHeight: 34,
    maxLines: 2,
  })
  const excerptMetrics = usePretextClamp<HTMLParagraphElement>({
    text: post.excerpt || 'Click to read more...',
    font: '300 16px Inter',
    lineHeight: 24,
    maxLines: 2,
  })

  // Stable random gradient based on post slug
  const activeGradient = getGradientByString(post.slug)

  // 预加载文章详情
  const prefetchPost = () => {
    if (!canPrefetchOnHover()) {
      return
    }
    if (import.meta.env.VITE_STATIC_EXPORT === 'true') {
      return
    }
    client.query({
      query: POST_QUERY,
      variables: { slug: post.slug },
      fetchPolicy: 'cache-first', // 如果缓存中有，就不再请求
    }).catch(() => {
      // 忽略预加载错误
    })
  }

  // 格式化日期时间
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  return (
    <motion.div
      className='group relative w-full overflow-hidden rounded-[24px] cursor-pointer h-64 md:h-80'
      style={{
        transformStyle: 'preserve-3d'
      }}
      initial={{ boxShadow: '0 16px 32px -16px rgba(15, 23, 42, 0.24)' }}
      whileHover={{
        y: shouldReduceEffects() ? -2 : -4,
        boxShadow: '0 20px 40px -18px rgba(59, 130, 246, 0.12)'
      }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
      onMouseEnter={prefetchPost}
      onClick={() => onNavigate(post.slug)}
    >
      {/* Background Layer */}
      <div
        className='absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.02]'
        style={{ backgroundColor: '#3b82f6' }}
      >
        {post.coverImageUrl
          ? (
            <img
              src={post.coverImageUrl}
              alt={post.title}
              loading='lazy'
              decoding='async'
              className='absolute inset-0 w-full h-full object-cover'
            />
            )
          : (
            <div className='absolute inset-0' style={{ background: activeGradient }} />
            )}
        {/* Noise Texture Overlay for texture */}
        <div className='absolute inset-0 opacity-20' style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      {/* Dark Gradient Overlay for Text Readability - Stronger at bottom */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent' />

      {/* Content Layer */}
      <div className='absolute bottom-0 inset-x-0 h-full flex flex-col justify-end !p-4 md:!p-6 z-10 transition-all duration-500'>
        <div className='transform transition-transform duration-500 translate-y-0 flex flex-col gap-0.5'>

          {/* Badge & Date */}
          <div className='flex items-center gap-3'>
            <span className='bg-white/20 backdrop-blur-md !px-1.5 !py-0.5 rounded-full text-white font-bold tracking-wider text-[10px] border border-white/20 shadow-sm'>
              {post.tags && post.tags.length > 0 ? `#${post.tags[0]}` : 'POST'}
            </span>
            <span className='text-gray-300 text-[10px] md:text-xs flex items-center font-medium drop-shadow-md'>
              <ClockCircleOutlined className='mr-1' />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
          </div>

          {/* Title - Scaled down for standard card but structurally identical */}
          <h1
            ref={titleMetrics.ref}
            className={`text-white !mb-0 font-extrabold leading-none tracking-tight drop-shadow-2xl line-clamp-2 ${
              titleMetrics.isOverflowing ? 'text-lg md:text-xl lg:text-2xl' : 'text-xl md:text-2xl lg:text-3xl'
            }`}
            style={{
              fontFamily: 'var(--font-display, inherit)',
              minHeight: titleMetrics.clampedHeight || undefined,
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt - Scaled down */}
          <p
            ref={excerptMetrics.ref}
            className='text-gray-100 text-sm md:text-base line-clamp-2 font-light tracking-wide opacity-90 mix-blend-plus-lighter text-shadow-sm mt-1'
            style={{ minHeight: excerptMetrics.clampedHeight || undefined }}
          >
            {post.excerpt || 'Click to read more...'}
          </p>

          {/* Footer: User & Read More */}
          <div className='flex items-center justify-between mt-2'>
            <div className='flex items-center gap-1'>
              <Avatar src={post.author.avatar} size='small' className='border border-white/80 bg-gray-600'>
                {post.author.username?.[0]?.toUpperCase()}
              </Avatar>
              <div className='flex flex-col'>
                <span className='text-white font-medium text-xs drop-shadow-md'>{post.author.username}</span>
              </div>
            </div>

            {/* Optional: Add back actions button if absolutely needed, but hidden for now to match 'unified' request */}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ArticleCard
