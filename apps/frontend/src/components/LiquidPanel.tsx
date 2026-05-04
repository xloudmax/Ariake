import React, { HTMLAttributes, useRef } from 'react'
import { InteractiveGlass } from '@/components/liquid-system'

export interface LiquidPanelProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  tone?: 'neutral' | 'brand' | 'inverse';
  variant?: 'control' | 'search';
}

export const LiquidPanel: React.FC<LiquidPanelProps> = ({
  width = '100%',
  height = '100%',
  borderRadius = '24px',
  tone = 'neutral',
  variant = 'control',
  className = '',
  children,
  ...props
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // LiquidGlass from the UI kit automatically observes dimensions if targetRef is provided
  // or it works as a wrapper perfectly well.
  const {
    onAnimationStart: _as,
    onDrag: _d,
    onDragStart: _ds,
    onDragEnd: _de,
    onPan: _p,
    onPanStart: _ps,
    onPanEnd: _pe,
    ...safeProps
  } = props as Record<string, unknown>

  return (
    <InteractiveGlass
      ref={panelRef}
      tone={tone}
      variant={variant}
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...props.style
      }}
      {...safeProps}
    >
      {children}
    </InteractiveGlass>
  )
}
