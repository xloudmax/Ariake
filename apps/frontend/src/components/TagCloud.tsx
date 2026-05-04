import React from 'react'

export interface TagItem {
  name: string;
  count: number;
}

interface TagCloudProps {
  tags: TagItem[];
  onTagClick: (tag: string) => void;
}

const TagCloud: React.FC<TagCloudProps> = ({ tags, onTagClick }) => {
  // 获取所有唯一标签并按出现次数排序
  const sortedTags = [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // 只显示前20个标签

  if (sortedTags.length === 0) {
    return null
  }

  return (
    <div className='w-full mb-8'>
      <div
        className='flex overflow-x-auto pb-4 space-x-3 no-scrollbar snap-x'
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
        }}
      >
        {sortedTags.map((tag) => (
          <div key={tag.name} className='snap-start flex-shrink-0'>
            <div
              onClick={() => onTagClick(tag.name)}
              className='cursor-pointer px-5 py-2.5 rounded-2xl flex items-center !gap-3 transition-all duration-300 hover:scale-105 active:scale-95'
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)'
              }}
            >
              <span className='font-semibold text-sm whitespace-nowrap' style={{ color: 'var(--color-text)' }}>
                #{tag.name}
              </span>
              <span className='bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full font-bold'>
                {tag.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TagCloud
