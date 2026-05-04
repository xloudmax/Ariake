// 导入Ant Design组件
import {
  Card,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Typography,
  Space,
  Tag
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  UserOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useSystemAdmin } from '@/hooks'

const { Text } = Typography

export default function AdminDashboard () {
  const {
    dashboard,
    stats,
    systemHealth,
    loading,
    error,
    formatMemoryUsage,
    refetchDashboard
  } = useSystemAdmin()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size='large' />
      </div>
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
          <LiquidButton variant='secondary' size='small' onClick={() => refetchDashboard()} className='!h-8 !px-3'>
            重试
          </LiquidButton>
        }
      />
    )
  }

  // 格式化运行时间
  const formatUptime = (uptimeStr: string) => {
    return uptimeStr
  }

  return (
    <div>
      {/* 页面标题已经在父组件中处理，这里直接显示内容 */}

      {/* 系统健康度 */}
      {systemHealth && (
        <div style={{ marginBottom: '24px' }}>
          <Space>
            <Tag
              className='optimized-tag'
              color={
                systemHealth.status === 'excellent'
                  ? 'blue'
                  : systemHealth.status === 'good'
                    ? 'green'
                    : systemHealth.status === 'warning' ? 'orange' : 'red'
              }
            >
              {systemHealth.status === 'excellent'
                ? '优秀'
                : systemHealth.status === 'good'
                  ? '良好'
                  : systemHealth.status === 'warning' ? '警告' : '严重'}
            </Tag>
            <span className='text-gray-600 dark:text-gray-300'>系统健康度: {systemHealth.score}/100</span>
          </Space>
        </div>
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className='optimized-card h-full'>
            <Statistic
              title='总用户数'
              value={stats?.userCount || dashboard?.userCount || 0}
              prefix={<UserOutlined style={{ color: 'var(--color-primary, #4f46e5)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className='optimized-card h-full'>
            <Statistic
              title='总文章数'
              value={stats?.postCount || dashboard?.postCount || 0}
              prefix={<FileTextOutlined style={{ color: 'var(--color-success-light, #10b981)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className='optimized-card h-full'>
            <Statistic
              title='内存使用'
              value={dashboard?.memory ? formatMemoryUsage(dashboard.memory.alloc) : '0 MB'}
              prefix={<DatabaseOutlined style={{ color: 'var(--color-warning-light, #f59e0b)' }} />}
              suffix={<span className='text-xs text-gray-400'>/ {dashboard?.memory ? formatMemoryUsage(dashboard.memory.totalAlloc) : '0 MB'}</span>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className='optimized-card h-full'>
            <Statistic
              title='运行时间'
              value={dashboard?.uptime ? formatUptime(dashboard.uptime) : '未知'}
              prefix={<ClockCircleOutlined style={{ color: 'var(--color-info-light, #3b82f6)' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统信息 */}
      {dashboard && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {/* 服务器信息 */}
          <Col xs={24} lg={12}>
            <Card title='服务器信息' className='optimized-card h-full'>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>主机名:</Text>
                  <Text>{dashboard.hostname}</Text>
                </div>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>Go 版本:</Text>
                  <Text>{dashboard.goVersion}</Text>
                </div>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>CPU 核心:</Text>
                  <Text>{dashboard.cpuCount}</Text>
                </div>
                <div className='flex justify-between'>
                  <Text type='secondary'>服务器时间:</Text>
                  <Text>{new Date(dashboard.serverTime).toLocaleString('zh-CN')}</Text>
                </div>
              </Space>
            </Card>
          </Col>

          {/* 内存详情 */}
          <Col xs={24} lg={12}>
            <Card title='内存使用详情' className='optimized-card h-full'>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>当前分配:</Text>
                  <Text>{formatMemoryUsage(dashboard.memory.alloc)}</Text>
                </div>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>累计分配:</Text>
                  <Text>{formatMemoryUsage(dashboard.memory.totalAlloc)}</Text>
                </div>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>系统内存:</Text>
                  <Text>{formatMemoryUsage(dashboard.memory.sys)}</Text>
                </div>
                <div className='flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2'>
                  <Text type='secondary'>堆分配:</Text>
                  <Text>{formatMemoryUsage(dashboard.memory.heapAlloc)}</Text>
                </div>
                <div className='flex justify-between'>
                  <Text type='secondary'>堆系统:</Text>
                  <Text>{formatMemoryUsage(dashboard.memory.heapSys)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
