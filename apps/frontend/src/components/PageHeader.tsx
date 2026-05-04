import React from 'react'
import { Typography } from 'antd'
import ThemeToggleButton from '@/components/ThemeToggleButton'

const { Title, Text } = Typography

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
  showThemeToggle?: boolean;
  label?: string;
  className?: string;
}

/**
 * Standard Page Header component to ensure layout consistency across subpages.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  extra,
  showThemeToggle = false,
  label,
  className = ''
}) => {
  return (
    <div className={`mb-6 md:mb-10 ${className}`}>
      {label && (
        <Text className='block text-[color:var(--color-primary)] font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mb-1.5 md:mb-2'>
          {label}
        </Text>
      )}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-start gap-4 md:gap-6'>
        <div className='flex-1 min-w-0'>
          <Title
            level={1}
            className='!mb-0 !text-2xl md:!text-5xl font-extrabold tracking-tight leading-tight md:leading-tight flex items-center gap-3 md:gap-4'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {icon && <span className='text-[color:var(--color-primary)] opacity-80 flex items-center'>{icon}</span>}
            {title}
          </Title>
          {subtitle && (
            <Text className='text-[color:var(--surface-text-secondary)] mt-2 md:mt-4 block text-base md:text-lg font-medium max-w-2xl leading-relaxed'>
              {subtitle}
            </Text>
          )}
        </div>

        {(actions || showThemeToggle) && (
          <div className='flex w-full md:w-auto items-center justify-end gap-3 self-stretch md:self-start'>
            {actions}
            {showThemeToggle && (
              <div className='md:hidden'>
                <ThemeToggleButton
                  useLiquid={false}
                  className='shrink-0'
                />
              </div>
            )}
          </div>
        )}
      </div>

      {extra && (
        <div className='mt-4 md:mt-6'>
          {extra}
        </div>
      )}
    </div>
  )
}
