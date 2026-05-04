import React from 'react'
import { Card, Skeleton } from 'antd'

const ArticleSkeleton: React.FC = () => {
  return (
    <Card className='article-card skeleton-card overflow-hidden'>
      <div className='h-48 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-t-lg mb-4' />
      <div className='p-4'>
        <Skeleton active paragraph={{ rows: 1 }} title={false} className='mb-3' />
        <Skeleton active paragraph={{ rows: 2 }} title={false} className='mb-4' />
        <div className='flex space-x-2 mb-4'>
          <div className='h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full' />
          <div className='h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full' />
        </div>
        <div className='flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700'>
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-2' />
            <div className='h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded' />
          </div>
          <div className='flex space-x-3'>
            <div className='h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded' />
            <div className='h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded' />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ArticleSkeleton
