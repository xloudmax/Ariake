// src/components/VersionHistory.tsx
// 版本历史管理组件
import React, { useEffect, useState } from 'react'
import { Modal, List, Typography, Spin, Space, Tag } from 'antd'
import { LiquidButton } from './LiquidButton'
import { usePostVersionsQuery, PostVersionsQueryData } from '../generated/graphql'

const { Text } = Typography

type BlogPostVersion = NonNullable<PostVersionsQueryData['postVersions']>[0]

interface VersionHistoryProps {
  /** 文章ID */
  postId: string;
  /** 是否显示版本历史弹窗 */
  visible: boolean;
  /** 关闭弹窗的回调 */
  onCancel: () => void;
  /** 恢复到指定版本的回调 */
  onRestore: (version: BlogPostVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  postId,
  visible,
  onCancel,
  onRestore
}) => {
  const { data, loading, error, refetch } = usePostVersionsQuery({
    variables: { postId },
    skip: !visible || !postId
  })
  const [selectedVersion, setSelectedVersion] = useState<BlogPostVersion | null>(null)

  const versions = data?.postVersions || []

  // 获取版本历史
  useEffect(() => {
    if (visible && postId) {
      refetch()
    }
  }, [visible, postId, refetch])

  // 处理版本选择
  const handleSelectVersion = (version: BlogPostVersion) => {
    setSelectedVersion(version)
  }

  // 处理恢复版本
  const handleRestore = () => {
    if (selectedVersion) {
      onRestore(selectedVersion)
      onCancel()
    }
  }

  // 格式化日期
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  // 渲染版本项
  const renderVersionItem = (version: BlogPostVersion) => {
    const isSelected = selectedVersion?.id === version.id
    return (
      <List.Item
        className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
        onClick={() => handleSelectVersion(version)}
      >
        <List.Item.Meta
          title={
            <Space>
              <span>版本 {version.versionNum}</span>
              {version.changeLog && (
                <Tag color='blue'>{version.changeLog}</Tag>
              )}
            </Space>
          }
          description={
            <div>
              <Text type='secondary'>{formatDateTime(version.createdAt)}</Text>
              <br />
              <Text type='secondary'>由 {version.createdBy.username} 创建</Text>
            </div>
          }
        />
      </List.Item>
    )
  }

  return (
    <Modal
      title='版本历史'
      open={visible}
      onCancel={onCancel}
      footer={[
        <LiquidButton key='cancel' onClick={onCancel} variant='secondary'>
          取消
        </LiquidButton>,
        <LiquidButton
          key='restore'
          variant='primary'
          onClick={handleRestore}
          disabled={!selectedVersion}
        >
          恢复到此版本
        </LiquidButton>
      ]}
      width={800}
    >
      {loading
        ? (
          <div className='flex justify-center items-center h-64'>
            <Spin size='large' />
          </div>
          )
        : error
          ? (
            <div className='text-center py-8'>
              <Text type='danger'>加载版本历史失败: {error.message}</Text>
              <br />
              <LiquidButton onClick={() => refetch()} variant='ghost'>重新加载</LiquidButton>
            </div>
            )
          : versions.length === 0
            ? (
              <div className='text-center py-8'>
                <Text type='secondary'>暂无版本历史</Text>
              </div>
              )
            : (
              <div>
                <div className='mb-4'>
                  <Text type='secondary'>点击选择要恢复的版本</Text>
                </div>
                <List
                  dataSource={versions}
                  renderItem={renderVersionItem}
                  bordered
                  className='max-h-96 overflow-y-auto'
                />
              </div>
              )}
    </Modal>
  )
}

export default VersionHistory
