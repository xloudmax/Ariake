import { useState } from 'react'
import {
  Card,
  Table,
  Alert,
  Typography,
  Space,
  Tooltip,
  Empty,
  Statistic,
  Row,
  Col,
  Tabs,
  Modal,
  Form,
  Input,
  notification,
  Tag,
  Popconfirm
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  TagsOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  MergeCellsOutlined,
  DeleteOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useAppUser } from '@/hooks'
import { useAdminNavigation } from '@/hooks/useAdmin'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_TAG_CATEGORY_STATS,
  MERGE_TAGS,
  MERGE_CATEGORIES,
  DELETE_UNUSED_TAGS,
  DELETE_UNUSED_CATEGORIES
} from '@/api/graphql/tag'

const { Title, Text } = Typography

export default function TagManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()
  const [activeTab, setActiveTab] = useState('tags')
  const [mergeModalVisible, setMergeModalVisible] = useState(false)
  const [mergeForm] = Form.useForm()

  // GraphQL queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_TAG_CATEGORY_STATS)
  const [mergeTags, { loading: mergingTags }] = useMutation(MERGE_TAGS)
  const [mergeCategories, { loading: mergingCategories }] = useMutation(MERGE_CATEGORIES)
  const [deleteUnusedTags, { loading: deletingTags }] = useMutation(DELETE_UNUSED_TAGS)
  const [deleteUnusedCategories, { loading: deletingCategories }] = useMutation(DELETE_UNUSED_CATEGORIES)

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert message='您需要管理员权限才能访问此页面' type='warning' showIcon />
    )
  }

  if (error) {
    return (
      <Alert
        message='加载失败'
        description={error.message}
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

  const stats = data?.getTagCategoryStats

  // 处理合并操作
  const handleMerge = async (values: { source: string; target: string }) => {
    try {
      const mutation = activeTab === 'tags' ? mergeTags : mergeCategories
      const { data: result } = await mutation({
        variables:
          activeTab === 'tags'
            ? { sourceTag: values.source, targetTag: values.target }
            : { sourceCategory: values.source, targetCategory: values.target }
      })

      const response = activeTab === 'tags' ? result.mergeTags : result.mergeCategories

      if (response.success) {
        notification.success({
          message: '成功',
          description: response.message,
          duration: 3
        })
        setMergeModalVisible(false)
        mergeForm.resetFields()
        refetch()
      } else {
        notification.error({
          message: '失败',
          description: response.message,
          duration: 5
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '操作失败',
        duration: 5
      })
    }
  }

  // 处理删除未使用
  const handleDeleteUnused = async () => {
    try {
      const mutation = activeTab === 'tags' ? deleteUnusedTags : deleteUnusedCategories
      const { data: result } = await mutation()

      const response =
        activeTab === 'tags' ? result.deleteUnusedTags : result.deleteUnusedCategories

      if (response.success) {
        notification.success({
          message: '成功',
          description: response.message,
          duration: 3
        })
        refetch()
      } else {
        notification.error({
          message: '失败',
          description: response.message,
          duration: 5
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '操作失败',
        duration: 5
      })
    }
  }

  // 标签表格列定义
  const tagColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <Text strong style={{ color: index < 3 ? '#ff4d4f' : undefined }}>
          {index + 1}
        </Text>
      )
    },
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: { count: number }) => (
        <Space>
          <Tag color='blue'>{name}</Tag>
          <Text type='secondary'>({record.count} 篇文章)</Text>
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'right' as const,
      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
      render: (count: number) => <Text strong>{count}</Text>
    }
  ]

  // 分类表格列定义
  const categoryColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <Text strong style={{ color: index < 3 ? '#ff4d4f' : undefined }}>
          {index + 1}
        </Text>
      )
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: { count: number }) => (
        <Space>
          <Tag color='green'>{name}</Tag>
          <Text type='secondary'>({record.count} 篇文章)</Text>
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'right' as const,
      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
      render: (count: number) => <Text strong>{count}</Text>
    }
  ]

  return (
    <div>
      {/* 页面标题和刷新按钮 */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          标签和分类管理
        </Title>
        <Tooltip title='刷新数据'>
          <LiquidButton
            variant='secondary'
            onClick={() => refetch()}
            loading={loading}
            className='!h-10 !px-4 flex items-center justify-center gap-2'
          >
            <ReloadOutlined spin={loading} /> 刷新
          </LiquidButton>
        </Tooltip>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title='总标签数'
              value={stats?.totalTags || 0}
              prefix={<TagsOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='总分类数'
              value={stats?.totalCategories || 0}
              prefix={<AppstoreOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='总条目数'
              value={(stats?.totalTags || 0) + (stats?.totalCategories || 0)}
              prefix={<BarChartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 主内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <LiquidButton
                variant='secondary'
                onClick={() => setMergeModalVisible(true)}
                className='!h-9 !px-4 flex items-center justify-center gap-2'
              >
                <MergeCellsOutlined /> 合并{activeTab === 'tags' ? '标签' : '分类'}
              </LiquidButton>
              <Popconfirm
                title={`确定要清理未使用的${activeTab === 'tags' ? '标签' : '分类'}吗？`}
                description='此操作将删除空标签或分类'
                onConfirm={handleDeleteUnused}
                okText='确认'
                cancelText='取消'
              >
                <LiquidButton
                  variant='danger'
                  loading={activeTab === 'tags' ? deletingTags : deletingCategories}
                  className='!h-9 !px-4 flex items-center justify-center gap-2'
                >
                  <DeleteOutlined /> 清理未使用
                </LiquidButton>
              </Popconfirm>
            </Space>
          }
        >
          <Tabs.TabPane
            tab={
              <Space>
                <TagsOutlined />
                <span>标签管理</span>
              </Space>
            }
            key='tags'
          >
            <Table
              columns={tagColumns}
              dataSource={stats?.tags || []}
              loading={loading}
              rowKey='name'
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个标签`
              }}
              locale={{
                emptyText: (
                  <Empty description='暂无标签' image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )
              }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <Space>
                <AppstoreOutlined />
                <span>分类管理</span>
              </Space>
            }
            key='categories'
          >
            <Table
              columns={categoryColumns}
              dataSource={stats?.categories || []}
              loading={loading}
              rowKey='name'
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个分类`
              }}
              locale={{
                emptyText: (
                  <Empty description='暂无分类' image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )
              }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 合并对话框 */}
      <Modal
        title={`合并${activeTab === 'tags' ? '标签' : '分类'}`}
        open={mergeModalVisible}
        onCancel={() => {
          setMergeModalVisible(false)
          mergeForm.resetFields()
        }}
        onOk={() => mergeForm.submit()}
        confirmLoading={activeTab === 'tags' ? mergingTags : mergingCategories}
      >
        <Form form={mergeForm} layout='vertical' onFinish={handleMerge}>
          <Form.Item
            label={`源${activeTab === 'tags' ? '标签' : '分类'}`}
            name='source'
            rules={[{ required: true, message: '请输入源名称' }]}
          >
            <Input placeholder='要合并的源名称' />
          </Form.Item>
          <Form.Item
            label={`目标${activeTab === 'tags' ? '标签' : '分类'}`}
            name='target'
            rules={[{ required: true, message: '请输入目标名称' }]}
          >
            <Input placeholder='合并到的目标名称' />
          </Form.Item>
          <Alert
            message='注意'
            description={`所有使用源${
              activeTab === 'tags' ? '标签' : '分类'
            }的文章将被更新为使用目标${activeTab === 'tags' ? '标签' : '分类'}。此操作不可撤销。`}
            type='warning'
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Modal>
    </div>
  )
}
