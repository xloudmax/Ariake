import React, { useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { HeroGlass } from '@/components/liquid-system'

export interface LiquidHeroProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const LiquidHero: React.FC<LiquidHeroProps> = React.memo(({
  title = 'Liquid Glass',
  subtitle = 'Apple iOS replica with 146x92 lens refracting the green container.',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Motion values for mouse tracking
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  // Smooth springs for the parallax effect
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 })

  // Transforms for different layers to create depth
  const rotateX = useTransform(springY, [0, 1], [10, -10])
  const rotateY = useTransform(springX, [0, 1], [-10, 10])

  const bgTranslateX = useTransform(springX, [0, 1], [-20, 20])
  const bgTranslateY = useTransform(springY, [0, 1], [-20, 20])

  const floatY = useTransform(springY, [0, 1], [-5, 5])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      // Calculate normalized mouse position (0 to 1)
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

      mouseX.set(x)
      mouseY.set(y)
    }

    const handleMouseLeave = () => {
      // Return to center when mouse leaves
      mouseX.set(0.5)
      mouseY.set(0.5)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[600px] flex items-center justify-center overflow-hidden rounded-3xl bg-[#0a0a0c] [perspective:1000px] ${className}`}
    >
      {/* Background abstract shapes that will be refracted */}
      <motion.div
        className='absolute inset-[-100px] pointer-events-none'
        style={{
          x: bgTranslateX,
          y: bgTranslateY,
          backgroundImage: `
            radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)
          `,
          filter: 'blur(40px)',
          opacity: 0.8
        }}
      />

      {/* Grid Pattern */}
      <div
        className='absolute inset-0 opacity-[0.03] pointer-events-none'
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main 3D Container */}
      <motion.div
        className='relative z-10 w-full max-w-4xl px-8 flex flex-col items-center justify-center [transform-style:preserve-3d]'
        style={{
          rotateX,
          rotateY,
          y: floatY
        }}
      >
        {/* Large Decorative Text Behind Glass */}
        <h1
          className='absolute text-[12vw] sm:text-[140px] font-black italic opacity-[0.03] text-white tracking-tighter select-none pointer-events-none whitespace-nowrap'
          style={{ transform: 'translateZ(-50px)' }}
        >
          REFRACT
        </h1>

        {/* The Liquid Glass Panes */}
        <div className='relative w-full max-w-2xl h-[300px] mb-12 [transform-style:preserve-3d]'>
          {/* Back Pane */}
          <div className='absolute inset-12 -z-10' style={{ transform: 'translateZ(-30px)' }}>
            <HeroGlass
              variant='spotlight'
              style={{
                width: 600,
                height: 200,
                borderRadius: 32
              }}
              className='w-full h-full opacity-60 backdrop-blur-sm'
            >
              <div className='w-full h-full bg-white/5 border border-white/10 rounded-[32px]' />
            </HeroGlass>
          </div>

          {/* Front Main Pane */}
          <div className='absolute inset-0' style={{ transform: 'translateZ(30px)' }}>
            <HeroGlass
              variant='poster'
              style={{
                width: 700,
                height: 300,
                borderRadius: 48,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.5)',
              }}
              className='w-full h-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]'
            >
              {/* Inner content for the glass */}
              <div className='w-full h-full p-8 flex flex-col justify-end bg-gradient-to-br from-white/10 to-transparent rounded-[48px]'>
                <div className='w-full h-full rounded-[30px] border border-white/20' />
              </div>
            </HeroGlass>
          </div>
        </div>

        {/* Title layer float above glass */}
        <motion.div
          className='text-center z-20 pointer-events-none'
          style={{ transform: 'translateZ(60px)' }}
        >
          <h2 className='text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40 mb-4 drop-shadow-lg'>
            {title}
          </h2>
          <p className='text-lg text-slate-300 max-w-lg mx-auto drop-shadow'>
            {subtitle}
          </p>
        </motion.div>

      </motion.div>
    </div>
  )
})
