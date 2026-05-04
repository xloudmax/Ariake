import React from 'react'
import { Tag } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import type { PostFilter } from '@/types'

interface ActiveFiltersProps {
  activeFilters: PostFilter;
  onFilterChange: (filter: PostFilter) => void;
  onClearFilters: () => void;
  className?: string;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  activeFilters,
  onFilterChange,
  onClearFilters,
  className = '',
}) => {
  const selectedTags = activeFilters.tags || []

  if (selectedTags.length === 0 && !activeFilters.status) {
    return null
  }

  const handleTagClose = (tagToRemove: string) => {
    onFilterChange({
      ...activeFilters,
      tags: selectedTags.filter(t => t !== tagToRemove)
    })
  }

  const handleStatusClose = () => {
    onFilterChange({
      ...activeFilters,
      status: undefined
    })
  }

  return (
    <div className={`flex flex-wrap gap-2 animate-fade-in items-center ${className}`}>
      {selectedTags.map(tag => (
        <Tag
          key={tag}
          closable
          onClose={() => handleTagClose(tag)}
          className='rounded-full !px-1.5 !py-0.5 border-0 backdrop-blur-md shadow-sm transition-all'
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            color: '#2563eb',
          }}
          closeIcon={<CloseOutlined className='text-blue-500 hover:text-blue-700 font-bold' style={{ fontSize: '10px' }} />}
        >
          #{tag}
        </Tag>
      ))}

      {activeFilters.status && (
        <Tag
          closable
          onClose={handleStatusClose}
          className='rounded-full !px-1.5 !py-0.5 border-0 backdrop-blur-md shadow-sm transition-all flex items-center'
          style={{
            backgroundColor: activeFilters.status === 'PUBLISHED'
              ? 'rgba(34, 197, 94, 0.12)'
              : activeFilters.status === 'DRAFT'
                ? 'rgba(249, 115, 22, 0.12)'
                : 'rgba(107, 114, 128, 0.12)',
            color: activeFilters.status === 'PUBLISHED'
              ? '#16a34a'
              : activeFilters.status === 'DRAFT'
                ? '#ea580c'
                : '#4b5563',
          }}
          closeIcon={<CloseOutlined className='ml-1 opacity-60 hover:opacity-100' style={{ fontSize: '10px' }} />}
        >
          <span className={`w-1.5 h-1.5 rounded-full mr-2 
            ${activeFilters.status === 'PUBLISHED'
? 'bg-green-500'
              : activeFilters.status === 'DRAFT' ? 'bg-orange-500' : 'bg-gray-500'}`}
          />
          <span className='text-xs font-semibold tracking-wide'>{activeFilters.status}</span>
        </Tag>
      )}

      <div
        onClick={onClearFilters}
        className='cursor-pointer text-gray-400 hover:text-red-500 text-[10px] font-medium tracking-wider ml-2 transition-colors uppercase'
      >
        Clear
      </div>
    </div>
  )
}

export default ActiveFilters
