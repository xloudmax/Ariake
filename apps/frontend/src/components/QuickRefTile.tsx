import React from 'react'
import { Card } from 'antd'
import { usePretextClamp } from '@/hooks/usePretextMetrics'

interface QuickRefTileProps {
  title: string;
  onClick: () => void;
}

const QuickRefTile: React.FC<QuickRefTileProps> = ({
  title,
  onClick,
}) => {
  const titleMetrics = usePretextClamp<HTMLSpanElement>({
    text: title,
    font: '600 18px Inter',
    lineHeight: 28,
    maxLines: 2,
  })

  return (
    <Card
      variant='borderless'
      onClick={onClick}
      className='cursor-pointer h-full border transition-all backdrop-blur-md bg-[color:var(--surface-elevated-glass)] border-[color:var(--surface-border)] hover:border-blue-500/40'
      styles={{ body: { padding: '20px', textAlign: 'center' } }}
    >
      <div className='flex min-h-[72px] items-center justify-center'>
        <span
          ref={titleMetrics.ref}
          className={`block w-full text-center font-medium capitalize leading-7 text-[color:var(--surface-text)] line-clamp-2 ${
            titleMetrics.isOverflowing ? 'text-base' : 'text-lg'
          }`}
          style={{ minHeight: titleMetrics.clampedHeight || undefined }}
        >
          {title}
        </span>
      </div>
    </Card>
  )
}

export default QuickRefTile
