'use client'

import { cn } from '@/utils/cn'
import { motion, type HTMLMotionProps } from 'framer-motion'
import React from 'react'
import { getBackdropStyle, getCheapGlassToken, type CheapGlassVariant, type GlassTone } from './tokens'

export interface CheapGlassProps extends HTMLMotionProps<'div'> {
  tone?: GlassTone;
  variant?: CheapGlassVariant;
}

export const CheapGlass = React.forwardRef<HTMLDivElement, CheapGlassProps>(({
  children,
  className,
  style,
  tone = 'neutral',
  variant = 'card',
  ...props
}, ref) => {
  const token = getCheapGlassToken(variant, tone)

  return (
    <motion.div
      ref={ref}
      {...props}
      className={cn('relative overflow-hidden border', token.className, className)}
      style={{
        ...getBackdropStyle(token),
        ...style,
      }}
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
    </motion.div>
  )
})

CheapGlass.displayName = 'CheapGlass'
