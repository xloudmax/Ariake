import React, { useState } from 'react'
import { Select, Popover, ConfigProvider, Grid } from 'antd'
import { LiquidButton } from './LiquidButton'
import { FilterOutlined } from '@ant-design/icons'
import { LiquidSearchBox } from './LiquidSearchBox'
import type { PostFilter } from '@/types'
import type { PostSortInput } from '@/generated/graphql'
import ThemeToggleButton from '@/components/ThemeToggleButton'

const { Option } = Select
const { useBreakpoint } = Grid

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filter: PostFilter) => void;
  activeFilters: PostFilter;
  activeSort?: PostSortInput;
  onSort?: (sort: PostSortInput) => void;
  onClearFilters: () => void;
  allTags: string[];
  className?: string;
  showThemeToggle?: boolean;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  activeFilters,
  activeSort,
  onSort,
  allTags,
  className = '',
  showThemeToggle = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const screens = useBreakpoint()
  const isMobile = !screens.md

  // Derive selected tags from props
  const selectedTags = activeFilters?.tags || []
  const filterLabelClass = 'mb-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--surface-text-muted)] md:text-xs'
  const filterButtonClass = `!w-8 md:!w-10 !h-8 md:!h-10 !p-0 flex items-center justify-center rounded-full transition-all ${
    selectedTags.length > 0 || activeFilters.status
      ? '!text-[color:var(--color-primary)] !bg-[color:var(--color-primary-soft)]/20'
      : '!text-[color:var(--surface-text-muted)] hover:!bg-[color:var(--surface-elevated)] hover:!text-[color:var(--surface-text)]'
  }`

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleTagChange = (tags: string[]) => {
    onFilter({ ...activeFilters, tags })
  }

  const handleStatusChange = (value: string) => {
    onFilter({ ...activeFilters, status: value as never })
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className='min-w-0 flex-1'>
        <LiquidSearchBox
          placeholder='Search topics...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearch}
          height={isMobile ? 44 : 52}
          variant='search'
          className='w-full'
          inputClassName={isMobile ? 'text-sm font-medium' : 'text-base font-medium'}
        >
          {/* Unified Filter Trigger inside Search Box */}
          <Popover
            placement={isMobile ? 'bottom' : 'bottomRight'}
            trigger='click'
            overlayStyle={{ width: isMobile ? 'calc(100vw - 32px)' : 'auto' }}
            styles={{
              body: {
                borderRadius: '16px',
                padding: isMobile ? '12px' : '16px',
                background: 'var(--surface-elevated-glass)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--surface-border)',
              }
            }}
            content={
              <ConfigProvider
                theme={{
                  components: {
                    Select: {
                      optionSelectedBg: 'var(--color-primary-soft)',
                      optionSelectedColor: 'var(--color-primary)',
                      colorBgContainer: 'var(--surface-elevated)',
                      colorText: 'var(--surface-text)',
                      colorTextPlaceholder: 'var(--surface-text-tertiary)',
                    }
                  }
                }}
              >
                <div className={isMobile ? 'w-full' : 'w-64'}>
                  <div className='mb-4'>
                    <div className={filterLabelClass}>SORT BY</div>
                    <Select
                      placeholder='Sort By'
                      value={activeSort?.field || 'created_at'}
                      onChange={(val) => onSort && onSort({ field: val, order: activeSort?.order || 'DESC' })}
                      style={{ width: '100%' }}
                      size={isMobile ? 'middle' : 'middle'}
                    >
                      <Option value='created_at'>Newest First</Option>
                      <Option value='view_count'>Most Viewed (Hot)</Option>
                      <Option value='like_count'>Most Liked</Option>
                    </Select>
                  </div>
                  <div className='mb-4'>
                    <div className={filterLabelClass}>TAGS</div>
                    <Select
                      mode='multiple'
                      placeholder='Select tags'
                      value={selectedTags}
                      onChange={handleTagChange}
                      style={{ width: '100%' }}
                      maxTagCount='responsive'
                      size={isMobile ? 'middle' : 'middle'}
                    >
                      {allTags.map(tag => (
                        <Option key={tag} value={tag}>{tag}</Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className={filterLabelClass}>STATUS</div>
                    <Select
                      placeholder='Status'
                      value={activeFilters.status}
                      onChange={handleStatusChange}
                      style={{ width: '100%' }}
                      allowClear
                      size={isMobile ? 'middle' : 'middle'}
                    >
                      <Option value='PUBLISHED'>Published</Option>
                      <Option value='DRAFT'>Draft</Option>
                      <Option value='ARCHIVED'>Archived</Option>
                    </Select>
                  </div>
                </div>
              </ConfigProvider>
            }
          >
            <LiquidButton
              variant='ghost'
              className={filterButtonClass}
            >
              <FilterOutlined className='text-sm md:text-base' />
            </LiquidButton>
          </Popover>
        </LiquidSearchBox>
      </div>

      {showThemeToggle && (
        <div className='md:hidden'>
          <ThemeToggleButton
            useLiquid={false}
            compact={isMobile}
            className='shrink-0'
          />
        </div>
      )}
    </div>
  )
}

export default SearchAndFilter
