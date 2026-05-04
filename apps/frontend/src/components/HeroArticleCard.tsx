import React, { useMemo } from 'react'
import { Avatar } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { motion, Variants } from 'framer-motion'
import type { BlogPost } from '@/types'
import { getGradientByString } from '@/utils/gradients'

interface HeroArticleCardProps {
  post: BlogPost;
  onNavigate: (slug: string) => void;
}

// 1. Move variants outside to prevent re-creation on every render
const CONTENT_VARIANTS: Variants = {
  initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: 'easeOut' }
  }
}

const HeroArticleCard: React.FC<HeroArticleCardProps> = React.memo(({ post, onNavigate }) => {
  const activeGradient = useMemo(() => getGradientByString(post.slug), [post.slug])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    } catch { return '' }
  }

  return (
    <motion.div
      className='group relative w-full h-full overflow-hidden rounded-[32px] cursor-pointer border border-white/10 bg-[#131316] ring-1 ring-inset ring-white/5'
      style={{
        boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.6)',
        transform: 'translateZ(0)', // Force GPU acceleration
        backfaceVisibility: 'hidden',
      }}
      onClick={() => onNavigate(post.slug)}
    >
      {/* Background - Use GPU optimized classes */}
      <div
        className='absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-105 will-change-transform'
        style={{ transform: 'translateZ(0)' }}
      >
        {post.coverImageUrl
          ? (
            <img
              src={post.coverImageUrl}
              alt={post.title}
              loading='lazy'
              className='absolute inset-0 w-full h-full object-cover'
            />
            )
          : (
            <div className='absolute inset-0' style={{ background: activeGradient }} />
            )}
        <div className='absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none' style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      <div className='absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent z-[2] pointer-events-none' />

      {/* Content - Optimized container */}
      <div className='absolute bottom-0 inset-x-0 h-full flex flex-col justify-end !p-5 md:!p-12 z-10 pointer-events-none'>
        <motion.div
          initial='initial'
          animate='animate'
          className='flex flex-col gap-2 md:gap-3 pointer-events-auto'
        >
          <motion.div variants={CONTENT_VARIANTS} transition={{ delay: 0.05 }} className='flex items-center gap-3'>
            <span className='bg-white/10 backdrop-blur-2xl !px-3 md:!px-4 !py-0.5 md:!py-1 rounded-full text-white font-black tracking-widest text-[9px] md:text-[10px] border border-white/20 shadow-xl uppercase ring-1 ring-white/10'>
              {post.tags?.[0] || 'Featured'}
            </span>
            <span className='text-white/60 text-[10px] md:text-xs flex items-center font-bold tracking-tight drop-shadow-md'>
              <ClockCircleOutlined className='mr-2 opacity-70' />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
          </motion.div>

          <motion.h2
            variants={CONTENT_VARIANTS}
            transition={{ delay: 0.1 }}
            className='text-white !mb-1 text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black leading-[0.95] tracking-tighter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] max-w-4xl'
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          >
            {post.title}
          </motion.h2>

          <motion.p
            variants={CONTENT_VARIANTS}
            transition={{ delay: 0.15 }}
            className='text-gray-300 text-sm md:text-lg lg:text-xl line-clamp-2 max-w-2xl font-medium tracking-tight opacity-90 leading-relaxed drop-shadow-md'
          >
            {post.excerpt || 'Explore the convergence of design, technology, and creativity.'}
          </motion.p>

          <motion.div
            variants={CONTENT_VARIANTS}
            transition={{ delay: 0.2 }}
            className='flex items-center justify-between mt-6'
          >
            <div className='flex items-center gap-3 bg-white/5 backdrop-blur-xl p-1.5 pr-4 rounded-full border border-white/10 shadow-lg'>
              <Avatar src={post.author.avatar} size={40} className='border-2 border-white/40 shadow-xl'>
                {post.author.username?.[0]?.toUpperCase()}
              </Avatar>
              <div className='flex flex-col'>
                <span className='text-white font-black text-sm tracking-tight'>{post.author.username}</span>
                <span className='text-white/50 text-[9px] font-bold uppercase tracking-[0.15em]'>Curator</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
})

export default HeroArticleCard
