import React from 'react'
import { Skeleton } from 'antd'

const HeroSkeleton: React.FC = () => {
  return (
    <div
      className='w-full relative overflow-hidden rounded-[24px] mb-12'
      style={{ height: '390px', backgroundColor: 'rgba(200, 200, 200, 0.1)' }}
    >
      <div className='absolute inset-0 p-8 md:p-12 flex flex-col justify-end'>
        {/* Top Label */}
        <div className='mb-4 flex items-center space-x-3'>
          <Skeleton.Button active size='small' style={{ width: 100, borderRadius: 4 }} />
          <Skeleton.Button active size='small' style={{ width: 150, borderRadius: 4 }} />
        </div>

        {/* Title */}
        <div className='mb-6'>
          <Skeleton.Input active size='large' block style={{ height: 48, marginBottom: 16, width: '80%' }} />
          <Skeleton.Input active size='large' block style={{ height: 48, width: '60%' }} />
        </div>

        {/* Excerpt */}
        <div className='mb-6'>
          <Skeleton paragraph={{ rows: 2 }} active />
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Skeleton.Avatar active size='large' />
            <div className='flex flex-col'>
              <Skeleton.Input active size='small' style={{ width: 80, height: 16, marginBottom: 4 }} />
              <Skeleton.Input active size='small' style={{ width: 50, height: 12 }} />
            </div>
          </div>
          <Skeleton.Button active size='large' shape='round' style={{ width: 120 }} />
        </div>
      </div>
    </div>
  )
}

export default HeroSkeleton
