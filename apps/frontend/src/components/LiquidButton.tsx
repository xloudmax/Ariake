'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { InteractiveGlass } from '@/components/liquid-system'

export interface LiquidButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
}

/**
 * LiquidButton - A premium, physics-based refraction button.
 * Leverages the LiquidGlass engine for realistic optical effects.
 */
export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'medium',
  loading = false,
  htmlType = 'button',
  style,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...props
}, forwardedRef) => {
  const internalRef = useRef<HTMLButtonElement>(null)
  const ref = internalRef
  const [isPressed, setIsPressed] = useState(false)

  // Sync forwardedRef with internalRef
  useLayoutEffect(() => {
    if (!forwardedRef) return
    if (typeof forwardedRef === 'function') {
      forwardedRef(internalRef.current)
    } else {
      (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = internalRef.current
    }
  }, [forwardedRef])

  const variantStyles = {
    primary: 'text-[color:var(--glass-brand-text)]',
    secondary: 'text-[color:var(--surface-text)]',
    danger: 'text-[color:var(--color-error-light)] dark:text-[color:var(--color-error-dark)]',
    ghost: 'text-[color:var(--surface-text-secondary)] hover:bg-white/5',
  }

  const sizeStyles = {
    small: 'px-3 py-1.5 text-xs h-8',
    medium: 'px-6 py-2.5 text-sm h-11',
    large: 'px-10 py-4 text-lg h-16',
  }

  const isDisabled = loading || props.disabled
  const glassTone = variant === 'primary' ? 'brand' : variant === 'danger' ? 'inverse' : 'neutral'
  const glassVariant = variant === 'ghost' ? 'control' : 'button'

  return (
    <motion.button
      ref={ref}
      type={htmlType}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? {} : { scale: 0.98, y: 0.5 }}
      // PASS user className here so it gets padding, border shape, text styling
      className={cn(
        'relative inline-flex items-center justify-center font-bold rounded-full transition-all duration-300 overflow-hidden border-0 bg-transparent group',
        variantStyles[variant],
        // Only apply default sizes if the user hasn't heavily customized the class
        (!className || (!className.includes('p-') && !className.includes('px-') && !className.includes('py-'))) ? sizeStyles[size] : '',
        isDisabled ? 'opacity-60 grayscale-[0.3] cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      style={{
        boxShadow: isDisabled ? 'none' : '0 4px 20px -5px rgba(0,0,0,0.15)',
        ...style
      }}
      {...props}
      onPointerDown={(event) => {
        if (isDisabled) return
        setIsPressed(true)
        onPointerDown?.(event)
      }}
      onPointerUp={(event) => {
        if (isDisabled) return
        setIsPressed(false)
        onPointerUp?.(event)
      }}
      onPointerLeave={(event) => {
        if (isDisabled) return
        setIsPressed(false)
        onPointerLeave?.(event)
      }}
      onClick={isDisabled ? undefined : props.onClick}
    >
      {/* Background glass strictly following the button's shape */}
      <InteractiveGlass
        variant={glassVariant}
        tone={glassTone}
        active={isPressed}
        className='absolute inset-0 z-0 pointer-events-none rounded-[inherit]'
      />

      {/* Gloss highlights for extra depth */}
      <div
        className='absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none transition-opacity duration-300 z-10'
        style={{ opacity: isDisabled ? 0.3 : 1 }}
      />

      {/* Shine effect on hover */}
      {!isDisabled && (
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none z-10' />
      )}

      <span className='relative z-20 flex items-center gap-2'>
        <AnimatePresence mode='wait'>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -10 }}
              className='flex items-center justify-center'
            >
              <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6],
                    borderRadius: ['40%', '50%', '40%']
                  }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                className={cn(
                    'w-2.5 h-2.5 bg-current mr-1',
                    variant === 'primary'
                      ? 'shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      : variant === 'danger'
                        ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                  )}
              />
              <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.2
                  }}
                className='w-1.5 h-1.5 bg-current rounded-full opacity-50'
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.span
          animate={loading ? { opacity: 0.8 } : { opacity: 1 }}
        >
          {children as React.ReactNode}
        </motion.span>
      </span>
    </motion.button>
  )
})

LiquidButton.displayName = 'LiquidButton'
