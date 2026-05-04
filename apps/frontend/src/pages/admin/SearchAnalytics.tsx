import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Alert,
  Typography,
  Space,
  Tooltip,
  Empty
} from 'antd'
import {
  SearchOutlined,
  LineChartOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  FireOutlined
} from '@ant-design/icons'
import { LiquidButton } from '@/components/LiquidButton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAppUser } from '@/hooks'
import { useAdminNavigation } from '@/hooks/useAdmin'
import { useSearchStats } from '@/api/graphql/search'

const { Title, Text } = Typography

export default function SearchAnalytics () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()
  const { searchStats, loading, error } = useSearchStats()
  const [refreshing, setRefreshing] = useState(false)

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert message='您需要管理员权限才能访问此页面' type='warning' showIcon />
    )
  }

  // 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true)
    // 刷新数据的逻辑会通过 Apollo Client 的 refetch 自动完成
    setTimeout(() => {
      setRefreshing(false)
      window.location.reload()
    }, 1000)
  }

  if (error) {
    return (
      <Alert
        message='加载失败'
        description={error.message}
        type='error'
        showIcon
        action={
          <LiquidButton variant='secondary' size='small' onClick={handleRefresh} className='!h-8 !px-3'>
            重试
          </LiquidButton>
        }
      />
    )
  }

  // 准备图表数据
  const chartData = searchStats?.searchTrends?.map(trend => ({
    date: trend.date,
    searches: trend.searchCount,
  })) || []

  // 热门查询表格列定义
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <Text strong style={{ color: index < 3 ? '#ff4d4f' : undefined }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: '搜索词',
      dataIndex: 'query',
      key: 'query',
      render: (query: string, _: unknown, index: number) => (
        <Space>
          {index < 3 && <FireOutlined style={{ color: '#ff4d4f' }} />}
          <Text strong={index < 3}>{query}</Text>
        </Space>
      ),
    },
    {
      title: '搜索次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'right' as const,
      render: (count: number) => (
        <Text type='secondary'>{count.toLocaleString()}</Text>
      ),
    },
    {
      title: '最后搜索时间',
      dataIndex: 'lastSearched',
      key: 'lastSearched',
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <Text type='secondary'>
            {new Date(date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 页面标题和刷新按钮 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>搜索分析</Title>
        <Tooltip title='刷新数据'>
          <LiquidButton
            variant='secondary'
            onClick={handleRefresh}
            loading={refreshing}
            className='!h-10 !px-4 flex items-center justify-center gap-2'
          >
            <ReloadOutlined spin={refreshing} /> 刷新
          </LiquidButton>
        </Tooltip>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title='总搜索次数'
              value={searchStats?.totalSearches || 0}
              prefix={<SearchOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='热门搜索词'
              value={searchStats?.popularQueries?.length || 0}
              prefix={<FireOutlined />}
              loading={loading}
              suffix='个'
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='搜索趋势记录'
              value={searchStats?.searchTrends?.length || 0}
              prefix={<LineChartOutlined />}
              loading={loading}
              suffix='天'
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索趋势图表 */}
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>搜索趋势</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        {chartData.length > 0
          ? (
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='date'
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }}
                  formatter={(value) => [Number(value) || 0, '搜索次数']}
                />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='searches'
                  name='搜索次数'
                  stroke='#1890ff'
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )
          : (
            <Empty
              description='暂无搜索趋势数据'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
            )}
      </Card>

      {/* 热门搜索词表格 */}
      <Card
        title={
          <Space>
            <FireOutlined />
            <span>热门搜索词</span>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={searchStats?.popularQueries || []}
          loading={loading}
          rowKey='query'
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个热门搜索词`,
          }}
          locale={{
            emptyText: (
              <Empty
                description='暂无热门搜索词'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  )
}
