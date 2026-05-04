import React, { InputHTMLAttributes, useState } from 'react'
import { InteractiveGlass } from '@/components/liquid-system'

export interface LiquidSearchBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'width' | 'height' | 'size'> {
  containerClassName?: string;
  inputClassName?: string;
  onSearch?: (value: string) => void;
  width?: number | string;
  height?: number | string;
  tone?: 'neutral' | 'brand' | 'inverse';
  variant?: 'search' | 'control';
  children?: React.ReactNode;
}

export const LiquidSearchBox: React.FC<LiquidSearchBoxProps> = React.memo(({
  containerClassName = 'w-full',
  inputClassName = '',
  width,
  height = 70,
  tone = 'neutral',
  variant = 'search',
  className = '',
  children,
  onSearch,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}) => {
  const borderRadius = typeof height === 'number' ? height / 2 : '35px'
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`transition-transform duration-200 ${containerClassName}`}>
      <InteractiveGlass
        tone={tone}
        variant={variant}
        focused={isFocused}
        style={{
          ...(width !== undefined ? { width } : {}),
          height,
          borderRadius
        }}
        className={`flex items-center box-border px-5 gap-2 w-full ${className}`}
      >
        <input
          type='text'
          className={`flex-1 bg-transparent border-none outline-none text-lg font-bold w-full text-black dark:text-white placeholder-slate-500 dark:placeholder-white/40 ${inputClassName}`}
          style={{ zIndex: 10 }}
          placeholder='Search with Liquid Glass...'
          onFocus={(event) => {
            setIsFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setIsFocused(false)
            onBlur?.(event)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSearch) {
              onSearch(String(props.value || ''))
            }
            onKeyDown?.(e)
          }}
          {...props}
        />
        {children && <div style={{ zIndex: 20 }}>{children}</div>}
      </InteractiveGlass>
    </div>
  )
})
