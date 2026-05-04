import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { LiquidButton } from './LiquidButton'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { BlogPost } from '@/types'
import HeroArticleCard from './HeroArticleCard'

interface HeroCarouselProps {
  posts: BlogPost[];
  onNavigate: (slug: string) => void;
  autoPlayInterval?: number;
}

// 1. Static variants to avoid re-creation
const CAROUSEL_VARIANTS: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    rotateY: direction > 0 ? 30 : -30,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
      rotateY: { type: 'spring', stiffness: 220, damping: 28 },
      opacity: { duration: 0.3 }
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    rotateY: direction < 0 ? 30 : -30,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
      rotateY: { type: 'spring', stiffness: 220, damping: 28 },
      opacity: { duration: 0.3 }
    }
  })
}

const HeroCarousel: React.FC<HeroCarouselProps> = React.memo(({
  posts,
  onNavigate,
  autoPlayInterval = 8000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const handleNext = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % posts.length)
  }, [posts.length])

  const handlePrev = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)
  }, [posts.length])

  // Optimized timer with dependency array
  useEffect(() => {
    if (posts.length <= 1) return
    const timer = setInterval(handleNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [handleNext, autoPlayInterval, posts.length, currentIndex])

  const activePost = useMemo(() => posts[currentIndex], [posts, currentIndex])

  if (!posts || posts.length === 0) return null

  return (
    <div className='relative w-full mx-auto mb-16 group h-[380px] md:h-[520px] overflow-hidden rounded-[32px]'>
      <div className='relative w-full h-full' style={{ perspective: '1200px' }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={activePost.id}
            custom={direction}
            variants={CAROUSEL_VARIANTS}
            initial='enter'
            animate='center'
            exit='exit'
            className='absolute inset-0 w-full h-full'
            style={{ willChange: 'transform, opacity', transformStyle: 'preserve-3d' }}
          >
            <HeroArticleCard post={activePost} onNavigate={onNavigate} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls - Optimized z-index and transitions */}
      {posts.length > 1 && (
        <>
          <div className='absolute left-6 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none'>
            <LiquidButton
              onClick={(e) => { e.stopPropagation(); handlePrev() }}
              className='!w-12 !h-12 !p-0 bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 hover:scale-105 flex items-center justify-center rounded-full shadow-2xl pointer-events-auto'
              variant='secondary'
            >
              <LeftOutlined />
            </LiquidButton>
          </div>

          <div className='absolute right-6 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none'>
            <LiquidButton
              onClick={(e) => { e.stopPropagation(); handleNext() }}
              className='!w-12 !h-12 !p-0 bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 hover:scale-105 flex items-center justify-center rounded-full shadow-2xl pointer-events-auto'
              variant='secondary'
            >
              <RightOutlined />
            </LiquidButton>
          </div>

          {/* Pagination Dots - Simplified layout animation */}
          <div className='absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2.5 items-center'>
            {posts.map((_, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (idx === currentIndex) return
                  setDirection(idx > currentIndex ? 1 : -1)
                  setCurrentIndex(idx)
                }}
                className='relative h-2 flex items-center cursor-pointer px-1'
              >
                <div className={`h-1 rounded-full transition-all duration-500 ease-in-out ${
                  idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                />
                {idx === currentIndex && (
                  <motion.div
                    layoutId='activeDot'
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className='absolute inset-0 bg-white/20 blur-[2px] rounded-full pointer-events-none'
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

export default HeroCarousel
