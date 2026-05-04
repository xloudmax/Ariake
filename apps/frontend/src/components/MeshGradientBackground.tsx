import React, { useEffect, useRef } from 'react'
import { useTheme } from './ThemeProvider'
import { useLocation } from 'react-router-dom'
import { isCorePublicPath, shouldReduceEffects } from '@/utils/performance'

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number; // Original radius to pulse around
  growth: number; // Rate of radius change
  color: string;
}

interface MeshBackgroundProfileInput {
  isDarkMode: boolean;
  pathname: string;
  reduceEffects: boolean;
}

interface MeshBackgroundProfile {
  isCoreRoute: boolean;
  lowPowerMode: boolean;
  targetFrameInterval: number;
  colors: string[];
  numOrbs: number;
  pulseRange: number;
  baseFill: string;
  canvas: {
    blur: number;
    opacity: number;
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export const resolveMeshBackgroundProfile = ({
  isDarkMode,
  pathname,
  reduceEffects,
}: MeshBackgroundProfileInput): MeshBackgroundProfile => {
  const isCoreRoute = isCorePublicPath(pathname)
  const lowPowerMode = reduceEffects

  return {
    isCoreRoute,
    lowPowerMode,
    targetFrameInterval: lowPowerMode ? 1000 / 24 : 1000 / 32,
    colors: isDarkMode
      ? [
          'hsla(230, 92%, 60%, 0.50)',
          'hsla(252, 90%, 62%, 0.44)',
          'hsla(195, 88%, 56%, 0.36)',
          'hsla(282, 82%, 62%, 0.30)',
        ]
      : [
          'hsla(212, 94%, 78%, 0.30)',
          'hsla(258, 88%, 80%, 0.24)',
          'hsla(192, 78%, 78%, 0.22)',
        ],
    numOrbs: lowPowerMode
      ? (isDarkMode ? 3 : 2)
      : (isDarkMode ? 6 : 5),
    pulseRange: lowPowerMode ? 24 : 72,
    baseFill: isDarkMode ? '#020617' : '#f8fafc',
    canvas: {
      blur: isCoreRoute ? 110 : 140,
      opacity: isDarkMode
        ? (isCoreRoute ? 0.56 : 0.64)
        : (isCoreRoute ? 0.34 : 0.42),
    },
  }
}

export const MeshGradientBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDarkMode } = useTheme()
  const location = useLocation()
  const profile = resolveMeshBackgroundProfile({
    isDarkMode,
    pathname: location.pathname,
    reduceEffects: shouldReduceEffects(),
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let orbs: Orb[] = []
    let lastFrame = 0
    let paused = false
    const effectProfile = resolveMeshBackgroundProfile({
      isDarkMode,
      pathname: location.pathname,
      reduceEffects: shouldReduceEffects(),
    })
    const { lowPowerMode, targetFrameInterval, colors, numOrbs, pulseRange, baseFill } = effectProfile

    const initOrbs = () => {
      orbs = []
      for (let i = 0; i < numOrbs; i++) {
        const radius = lowPowerMode
          ? (Math.random() * 120 + 140)
          : (Math.random() * 220 + 220)
        orbs.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * (lowPowerMode ? 0.35 : 0.9),
          vy: (Math.random() - 0.5) * (lowPowerMode ? 0.35 : 0.9),
          radius,
          baseRadius: radius,
          growth: (Math.random() - 0.5) * (lowPowerMode ? 0.18 : 0.4),
          color: colors[i % colors.length],
        })
      }
    }

    const resizeCanvas = () => {
      if (canvas) {
        // Slightly larger than screen to hide edges when blurring
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    const updateAndDraw = (timestamp = 0) => {
      if (!ctx || !canvas) return
      if (paused) {
        animationFrameId = requestAnimationFrame(updateAndDraw)
        return
      }
      if (timestamp - lastFrame < targetFrameInterval) {
        animationFrameId = requestAnimationFrame(updateAndDraw)
        return
      }
      lastFrame = timestamp

      // Clear canvas
      ctx.fillStyle = baseFill
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update positions
      orbs.forEach((orb) => {
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce off walls with buffer (allows them to go slightly off screen)
        const bounceBuffer = orb.radius / 2
        if (orb.x < -bounceBuffer) orb.vx = Math.abs(orb.vx)
        if (orb.x > canvas.width + bounceBuffer) orb.vx = -Math.abs(orb.vx)
        if (orb.y < -bounceBuffer) orb.vy = Math.abs(orb.vy)
        if (orb.y > canvas.height + bounceBuffer) orb.vy = -Math.abs(orb.vy)

        // Pulse radius
        orb.radius += orb.growth
        if (orb.radius > orb.baseRadius + pulseRange || orb.radius < orb.baseRadius - pulseRange) {
          orb.growth = -orb.growth
        }

        // Draw
        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, Math.max(0, orb.radius)
        )
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, 'transparent') // Smooth fade

        ctx.beginPath()
        ctx.fillStyle = gradient
        // Composite operation to blend colors beautifully
        ctx.globalCompositeOperation = isDarkMode ? 'screen' : 'multiply'
        // 'screen' makes lights additive (glowing), 'multiply' mixes pigments (watercolor)

        // Fallback for light mode if multiply is too dark, use 'source-over' or 'overlay'
        if (!isDarkMode) ctx.globalCompositeOperation = 'source-over'

        ctx.arc(orb.x, orb.y, Math.max(0, orb.radius), 0, Math.PI * 2)
        ctx.fill()

        // Reset composite
        ctx.globalCompositeOperation = 'source-over'
      })

      animationFrameId = requestAnimationFrame(updateAndDraw)
    }

    const handleVisibilityChange = () => {
      paused = document.visibilityState !== 'visible'
    }

    window.addEventListener('resize', resizeCanvas)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Initial setup
    resizeCanvas()
    initOrbs()
    updateAndDraw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isDarkMode, location.pathname])

  return (
    <canvas
      ref={canvasRef}
      className='fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-1000'
      style={{
        zIndex: 0,
        filter: `blur(${profile.canvas.blur}px)`,
        opacity: profile.canvas.opacity,
      }}
    />
  )
}
