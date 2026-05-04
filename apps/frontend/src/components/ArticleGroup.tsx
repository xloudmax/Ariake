import React from 'react'
import { Typography } from 'antd'
import { DownOutlined, RightOutlined } from '@ant-design/icons'
import type { BlogPost } from '@/types'
import ArticleCard from './ArticleCard'

const { Text } = Typography

interface ArticleGroupProps {
  groupName: string;
  posts: BlogPost[];
  isCollapsed: boolean;
  onToggle: (groupName: string) => void;
  onNavigate: (slug: string) => void;
  onAction: (action: 'view' | 'edit' | 'share', post: BlogPost) => void;
}

const ArticleGroup: React.FC<ArticleGroupProps> = ({
  groupName,
  posts,
  isCollapsed,
  onToggle,
  onNavigate,
  onAction
}) => {
  const toggleGroup = () => {
    onToggle(groupName)
  }

  return (
    <div className='mb-8'>
      {/* 分组标题 */}
      <div
        className='group-header flex items-center space-x-3 py-3 px-4 cursor-pointer select-none rounded-lg transition-all duration-300 mb-4'
        onClick={toggleGroup}
      >
        <div className='transform transition-transform duration-300'>
          {isCollapsed
            ? (
              <RightOutlined className='text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300' />
              )
            : (
              <DownOutlined className='text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300' />
              )}
        </div>
        <Text className='font-semibold text-gray-800 dark:text-gray-200 text-xl'>
          {groupName}
        </Text>
        <Text className='text-base text-gray-500 font-normal bg-gray-100 dark:bg-gray-700 rounded-full !px-1.5 !py-0.5'>
          {posts.length}
        </Text>
      </div>

      {/* 文章列表 */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-screen opacity-100'
        }`}
      >
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {posts.map((post) => (
            <ArticleCard
              key={post.id}
              post={post}
              onNavigate={onNavigate}
              onAction={onAction}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ArticleGroup
