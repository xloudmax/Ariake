import React, { useMemo, useState } from 'react'
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Popover } from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import { useTheme } from '@/components/ThemeProvider'

interface ThemeToggleButtonProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  useLiquid?: boolean;
  chromeless?: boolean;
  iconSize?: number;
}

const modeLabels = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
} as const

const iconMap = {
  system: DesktopOutlined,
  light: SunOutlined,
  dark: MoonOutlined,
} as const

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  compact = false,
  showLabel = false,
  useLiquid = true,
  chromeless = false,
  iconSize = 18,
}) => {
  const { mode, setMode, theme } = useTheme()
  const [open, setOpen] = useState(false)

  const TriggerIcon = useMemo(() => {
    if (mode === 'system') {
      return iconMap.system
    }
    return theme === 'dark' ? iconMap.dark : iconMap.light
  }, [mode, theme])

  const content = (
    <div className='flex flex-col gap-2 min-w-36'>
      {(['system', 'light', 'dark'] as const).map((candidateMode) => {
        const CandidateIcon = iconMap[candidateMode]
        const isActive = mode === candidateMode

        if (!useLiquid) {
          return (
            <button
              key={candidateMode}
              type='button'
              className={`flex h-10 items-center gap-3 rounded-2xl px-4 text-sm transition-colors ${
                isActive
                  ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]'
                  : 'text-[color:var(--surface-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              onClick={() => {
                setMode(candidateMode)
                setOpen(false)
              }}
            >
              <CandidateIcon />
              <span>{modeLabels[candidateMode]}</span>
            </button>
          )
        }

        return (
          <LiquidButton
            key={candidateMode}
            variant={isActive ? 'primary' : 'secondary'}
            className='!justify-start !rounded-2xl !h-10 !px-4'
            onClick={() => {
              setMode(candidateMode)
              setOpen(false)
            }}
          >
            <CandidateIcon />
            <span>{modeLabels[candidateMode]}</span>
          </LiquidButton>
        )
      })}
    </div>
  )

  return (
    <Popover
      trigger='click'
      placement='bottomRight'
      open={open}
      onOpenChange={setOpen}
      content={content}
      styles={{
        body: {
          padding: 12,
          borderRadius: 20,
          background: 'var(--surface-elevated-glass)',
          backdropFilter: 'blur(18px)',
          border: '1px solid var(--surface-border)',
          boxShadow: 'var(--shadow-lg)',
        }
      }}
    >
      {useLiquid
        ? (
          <LiquidButton
            aria-label='主题模式'
            variant='secondary'
            className={`${compact ? '!w-11 !h-11 !p-0' : '!h-11 !px-4'} ${className}`}
          >
            <TriggerIcon style={{ fontSize: iconSize }} />
            {showLabel && <span>{modeLabels[mode]}</span>}
          </LiquidButton>
          )
        : (
          <button
            type='button'
            aria-label='主题模式'
            className={`inline-flex items-center justify-center gap-2 transition-colors ${
              chromeless
                ? `rounded-xl border-0 bg-transparent shadow-none backdrop-blur-0 ${
                    theme === 'dark'
                      ? 'text-gray-500 hover:text-white hover:bg-white/5'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-black/5'
                  }`
                : 'rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-[color:var(--surface-text)] shadow-sm backdrop-blur-xl hover:bg-black/5 dark:hover:bg-white/5'
            } ${
              compact ? 'h-11 w-11 p-0' : 'h-11 px-4'
            } ${className}`}
          >
            <TriggerIcon style={{ fontSize: iconSize }} />
            {showLabel && <span>{modeLabels[mode]}</span>}
          </button>
          )}
    </Popover>
  )
}

export default ThemeToggleButton
