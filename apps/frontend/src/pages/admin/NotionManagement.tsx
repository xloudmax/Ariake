import { useState } from 'react'
import {
  Card,
  Table,
  Alert,
  Typography,
  Space,
  Tooltip,
  Empty,
  message,
  Popconfirm
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  CloudSyncOutlined,
  ReloadOutlined,
  LinkOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useAppUser, useAdminNavigation } from '@/hooks'
import { useNotionPages, useNotionSync } from '@/api/graphql/admin'
import { NotionPage } from '@/generated/graphql'

const { Title, Text } = Typography

export default function NotionManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()
  const { pages, loading: loadingPages, error: pagesError, refetch } = useNotionPages()
  const { syncNotion, loading: syncing } = useNotionSync()
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert message='您需要管理员权限才能访问此页面' type='warning' showIcon />
    )
  }

  // 处理同步单个页面
  const handleSyncPage = async (pageId: string) => {
    try {
      setSyncingId(pageId)
      const result = await syncNotion(pageId)
      if (result.success) {
        message.success('同步成功')
        refetch() // 刷新列表状态
      } else {
        message.error(result.message || '同步失败')
      }
    } catch (err: unknown) {
      const error = err as Error
      message.error(error.message || '操作失败')
    } finally {
      setSyncingId(null)
    }
  }

  // 处理同步所有页面
  const handleSyncAll = async () => {
    try {
      setSyncingId('all')
      const result = await syncNotion()
      if (result.success) {
        message.success('全量同步成功')
        refetch()
      } else {
        message.error(result.message || '同步失败')
      }
    } catch (err: unknown) {
      const error = err as Error
      message.error(error.message || '操作失败')
    } finally {
      setSyncingId(null)
    }
  }

  if (pagesError) {
    return (
      <Alert
        message='加载失败'
        description={pagesError.message}
        type='error'
        showIcon
        action={
          <LiquidButton variant='secondary' size='small' onClick={() => refetch()} className='!h-8 !px-3'>
            重试
          </LiquidButton>
        }
      />
    )
  }

  const columns = [
    {
      title: '页面标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: NotionPage) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{title || '无标题'}</Text>
          <a href={record.url} target='_blank' rel='noopener noreferrer' style={{ color: '#8c8c8c' }}>
            <LinkOutlined />
          </a>
        </Space>
      )
    },
    {
      title: 'Page ID',
      dataIndex: 'id',
      key: 'id',
      width: 300,
      render: (id: string) => <Text type='secondary' code>{id}</Text>
    },
    {
      title: '最后编辑时间',
      dataIndex: 'lastEditedAt',
      key: 'lastEditedAt',
      width: 200,
      render: (date: string) => {
        try {
          return new Date(date).toLocaleString()
        } catch {
          return date
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'right' as const,
      render: (_: unknown, record: NotionPage) => (
        <LiquidButton
          variant='secondary'
          size='small'
          loading={syncingId === record.id}
          disabled={syncing && syncingId !== record.id}
          onClick={() => handleSyncPage(record.id)}
          className='!h-8 !px-4 flex items-center gap-1 border-blue-200 text-blue-500 hover:border-blue-400'
        >
          <CloudSyncOutlined spin={syncingId === record.id} />
          {syncingId === record.id ? '同步中' : '同步'}
        </LiquidButton>
      )
    }
  ]

  return (
    <div>
      {/* 页面标题和操作栏 */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <Title level={3} style={{ margin: 0 }}>
            Notion 内容同步
          </Title>
          <Text type='secondary'>
            共 {pages.length} 个页面
          </Text>
        </div>
        <Space>
          <Tooltip title='刷新列表'>
            <LiquidButton
              variant='secondary'
              onClick={() => refetch()}
              loading={loadingPages}
              className='!h-10 !px-4 flex items-center justify-center gap-2'
            >
              <ReloadOutlined spin={loadingPages} /> 刷新列表
            </LiquidButton>
          </Tooltip>
          <Popconfirm
            title='确定要同步所有页面吗？'
            description='这将耗费较长时间，请耐心等待。'
            onConfirm={handleSyncAll}
            okText='开始同步'
            cancelText='取消'
          >
            <LiquidButton
              variant='primary'
              loading={syncingId === 'all'}
              disabled={syncing}
              onClick={handleSyncAll}
              className='!h-10 !px-6 flex items-center justify-center gap-2'
            >
              <CloudSyncOutlined spin={syncingId === 'all'} /> 全量同步
            </LiquidButton>
          </Popconfirm>
        </Space>
      </div>

      {/* 说明提示 */}
      <Alert
        message='同步说明'
        description='点击列表中的“同步”按钮可更新单篇文章。使用右上角的“全量同步”将检查并更新所有变更。系统会自动匹配 Page ID，如果文章不存在则创建，存在则更新。'
        type='info'
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 列表内容 */}
      <Card>
        <Table
          columns={columns}
          dataSource={pages}
          loading={loadingPages}
          rowKey='id'
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个页面`
          }}
          locale={{
            emptyText: (
              <Empty
                description='未找到 Notion 页面'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <LiquidButton variant='ghost' className='!h-8 !text-blue-500 hover:!text-blue-600' onClick={() => refetch()}>重新加载</LiquidButton>

              </Empty>
            )
          }}
        />
      </Card>
    </div>
  )
}
