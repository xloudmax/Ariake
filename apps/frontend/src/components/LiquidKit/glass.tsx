'use client'

import { cn } from '@/utils/cn'
import { type HTMLMotionProps, motion } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { useLiquidSurface, LiquidGlassProps } from './use-liquid-surface'

export const LiquidGlassCore: React.FC<LiquidGlassProps & HTMLMotionProps<'div'>> = React.memo(({
  children,
  disableRefraction = false,
  glassThickness,
  bezelWidth,
  blur,
  bezelHeightFn,
  refractiveIndex,
  specularOpacity,
  specularSaturation,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  targetRef,
  width,
  height,
  borderRadius,
  ...props
}) => {
  const { ref, filterId, filterNode, filterStyles } = useLiquidSurface({
    disableRefraction,
    glassThickness,
    bezelWidth,
    blur,
    bezelHeightFn,
    refractiveIndex,
    specularOpacity,
    specularSaturation,
    dpr,
    targetRef,
    width,
    height,
    borderRadius,
  })

  useEffect(() => {
    if (targetRef?.current && !disableRefraction) {
      targetRef.current.style.backdropFilter = `url(#${filterId})`
    }
  }, [targetRef, filterId, disableRefraction])

  return (
    <>
      {filterNode}
      {!targetRef && (
        <LiquidDiv
          {...props}
          style={{
            ...props.style,
            ...filterStyles,
          }}
          filterId={filterId}
          ref={ref as React.Ref<HTMLDivElement>}
          fallbackBlur={typeof blur === 'number' ? blur : 0.3}
          disableRefraction={disableRefraction}
        >
          {children}
        </LiquidDiv>
      )}
    </>
  )
})
LiquidGlassCore.displayName = 'LiquidGlassCore'

export const LiquidGlass = LiquidGlassCore

const LiquidDiv = React.forwardRef<HTMLDivElement, { filterId: string; fallbackBlur?: number; disableRefraction?: boolean } & HTMLMotionProps<'div'>>(
  ({ children, filterId, fallbackBlur = 0.3, disableRefraction = false, className, ...props }, ref) => {
    const [isLiquidSupported, setIsLiquidSupported] = useState(false)

    const supportsSVGFilters = useCallback(() => {
      // Tauri (WKWebView) injects __TAURI_INTERNALS__ — it supports SVG backdrop-filter natively.
      const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
      if (isTauri) return true

      // Pure Safari (WebKit without Chrome in UA) does NOT support SVG backdrop-filter.
      const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isFirefox = /Firefox/.test(navigator.userAgent)

      if (isWebkit || isFirefox) {
        return false
      }

      const div = document.createElement('div')
      div.style.backdropFilter = `url(#${filterId})`
      return div.style.backdropFilter !== ''
    }, [filterId])

    useEffect(() => {
      if (disableRefraction) {
        setIsLiquidSupported(false)
        return
      }
      const svgSupported = supportsSVGFilters()
      setIsLiquidSupported(svgSupported && typeof document !== 'undefined')
    }, [supportsSVGFilters, disableRefraction])

    return (
      <motion.div
        ref={ref}
        {...props}
        className={cn('bg-white/5', isLiquidSupported ? '' : 'border', className)}
        style={{
          boxShadow: '0 3px 14px rgba(0,0,0,0.1)',
          ...props.style,
          ...(isLiquidSupported
            ? {}
            : {
                backdropFilter: `blur(${Math.max(disableRefraction ? 8 : fallbackBlur * 5, 0)}px)`,
                WebkitBackdropFilter: `blur(${Math.max(disableRefraction ? 8 : fallbackBlur * 5, 0)}px)`,
              }),
        }}
      >
        {children}
      </motion.div>
    )
  }
)
LiquidDiv.displayName = 'LiquidDiv'
