'use client'

import { cn } from '@/utils/cn'
import { type HTMLMotionProps } from 'framer-motion'
import React from 'react'
import { LiquidGlassCore } from '@/components/LiquidKit/glass'
import { useGlassCapability, type GlassInteractionState } from './capability'
import { CheapGlass } from './CheapGlass'
import { getBackdropStyle, getInteractiveGlassToken, type GlassTone, type InteractiveGlassVariant } from './tokens'

export interface InteractiveGlassProps extends HTMLMotionProps<'div'> {
  tone?: GlassTone;
  variant?: InteractiveGlassVariant;
  active?: boolean;
  focused?: boolean;
  selected?: boolean;
  interactionState?: GlassInteractionState;
}

export const InteractiveGlass = React.forwardRef<HTMLDivElement, InteractiveGlassProps>(({
  children,
  className,
  style,
  tone = 'neutral',
  variant = 'control',
  active = false,
  focused = false,
  selected = false,
  interactionState,
  ...props
}, ref) => {
  const token = getInteractiveGlassToken(variant, tone)
  const resolvedState = interactionState ?? (active ? 'drag' : focused ? 'focus' : selected ? 'selected' : 'idle')
  const capability = useGlassCapability({
    grade: 'interactive',
    interactionState: resolvedState,
    interactiveVariant: variant,
  })

  if (!capability.allowRefraction) {
    return (
      <CheapGlass
        ref={ref}
        variant={token.fallbackVariant}
        tone={tone}
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

InteractiveGlass.displayName = 'InteractiveGlass'
