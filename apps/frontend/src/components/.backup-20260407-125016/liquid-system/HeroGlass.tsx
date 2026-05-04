'use client'

import { cn } from '@/utils/cn'
import { type HTMLMotionProps } from 'framer-motion'
import React from 'react'
import { useGlassCapability } from './capability'
import { CheapGlass } from './CheapGlass'
import { getBackdropStyle, getHeroGlassToken, type GlassTone, type HeroGlassVariant } from './tokens'
import { InteractiveGlass } from './InteractiveGlass'
import { LiquidGlassCore } from '@/components/LiquidKit/glass'

export interface HeroGlassProps extends HTMLMotionProps<'div'> {
  tone?: GlassTone;
  variant?: HeroGlassVariant;
}

export const HeroGlass = React.forwardRef<HTMLDivElement, HeroGlassProps>(({
  children,
  className,
  style,
  tone = 'neutral',
  variant = 'poster',
  ...props
}, ref) => {
  const token = getHeroGlassToken(variant, tone)
  const capability = useGlassCapability({
    grade: 'hero',
    heroVariant: variant,
  })

  if (!capability.allowRefraction) {
    if (capability.renderGrade === 'interactive') {
      return (
        <InteractiveGlass
          ref={ref}
          tone={tone}
          variant='control'
          className={className}
          style={style}
          {...props}
        >
          {children as React.ReactNode}
        </InteractiveGlass>
      )
    }

    return (
      <CheapGlass
        ref={ref}
        tone={tone}
        variant='overlay'
        className={className}
        style={style}
        {...props}
      >
        {children as React.ReactNode}
      </CheapGlass>
    )
  }

  return (
    <LiquidGlassCore
      ref={ref}
      blur={token.core.blur}
      glassThickness={token.core.glassThickness}
      bezelWidth={token.core.bezelWidth}
      refractiveIndex={token.core.refractiveIndex}
      specularOpacity={token.core.specularOpacity}
      specularSaturation={token.core.specularSaturation}
      bezelHeightFn={token.core.bezelHeightFn}
      className={cn('relative overflow-hidden border', token.className, className)}
      style={{
        ...getBackdropStyle(token),
        ...style,
      }}
      {...props}
    >
      {token.highlightClassName
        ? (
          <div
            aria-hidden='true'
            className={cn('pointer-events-none absolute inset-0', token.highlightClassName)}
          />
          )
        : null}
      {children as React.ReactNode}
    </LiquidGlassCore>
  )
})

HeroGlass.displayName = 'HeroGlass'
