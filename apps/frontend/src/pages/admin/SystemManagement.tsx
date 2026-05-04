import { useState, useEffect } from 'react'
import { useSystemAdmin, useAdminNavigation } from '../../hooks'
import { useAppUser } from '../../hooks'
// 导入Ant Design组件
import {
  Card,
  Alert,
  Spin,
  Statistic,
  Row,
  Col,
  Typography,
  notification,
  Descriptions,
  Space,
  Progress,
  Tag,
  Modal,
  Switch,
  Tooltip
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  ReloadOutlined,
  WarningOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ClusterOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { useGitHubDeployment } from '../../api/graphql'
import { GithubOutlined, SaveOutlined, RocketOutlined, LockOutlined } from '@ant-design/icons'
import { Input } from 'antd'

const { Text } = Typography

export default function SystemManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()

  const {
    dashboard,
    loading,
    error,
    clearCache: handleClearCache,
    rebuildSearchIndex: handleRebuildSearchIndex,
    formatMemoryUsage,
    refetchDashboard,
    refetchStats
  } = useSystemAdmin()

  // 本地状态
  const [operationLoading, setOperationLoading] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // GitHub 部署 Hook
  const {
    config: githubConfig,
    updateConfig,
    deploy: handleDeploy
  } = useGitHubDeployment()

  const [editConfig, setEditConfig] = useState({ repo: '', token: '' })
  const [isEditing, setIsEditing] = useState(false)

  // 同步配置
  useEffect(() => {
    if (githubConfig && !isEditing) {
      setEditConfig({
        repo: githubConfig.repo || '',
        token: githubConfig.token || '',
      })
    }
  }, [githubConfig, isEditing])

  // 保存配置
  const handleSaveConfig = async () => {
    setOperationLoading('github_config')
    try {
      await updateConfig(editConfig.repo, editConfig.token)
      notification.success({
        message: '成功',
        description: 'GitHub 配置已更新',
      })
      setIsEditing(false)
    } catch (err: unknown) {
      notification.error({
        message: '更新失败',
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setOperationLoading(null)
    }
  }

  // 执行部署
  const handleDeployAction = () => {
    Modal.confirm({
      title: '确认部署到 GitHub Pages',
      icon: <RocketOutlined style={{ color: '#1890ff' }} />,
      content: '这将生成静态站点并推送到指定的 GitHub 仓库（gh-pages 分支）。确定要继续吗？',
      okText: '开始部署',
      cancelText: '取消',
      async onOk () {
        setOperationLoading('deploy')
        try {
          const result = await handleDeploy()
          if (result?.success) {
            notification.success({
              message: '部署成功',
              description: result.message || '静态站点已成功发布到 GitHub Pages',
            })
          } else {
            throw new Error(result?.message || '部署过程出错')
          }
        } catch (err: unknown) {
          notification.error({
            message: '部署失败',
            description: err instanceof Error ? err.message : String(err),
            duration: 10,
          })
        } finally {
          setOperationLoading(null)
        }
      },
    })
  }

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refetchDashboard()
      refetchStats()
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh, refetchDashboard, refetchStats])

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert
        message='权限不足'
        description='您需要管理员权限才能访问此页面'
        type='warning'
        showIcon
      />
    )
  }

  // 清理缓存（带确认）
  const handleClearCacheAction = () => {
    Modal.confirm({
      title: '确认清理缓存',
      icon: <ExclamationCircleOutlined />,
      content: '清理缓存可能会暂时影响性能，确定要继续吗？',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk () {
        setOperationLoading('cache')
        try {
          await handleClearCache()
          notification.success({
            message: '成功',
            description: '缓存清理成功！',
            duration: 3,
          })
        } catch (err: unknown) {
          const error = err as Error
          notification.error({
            message: '错误',
            description: error.message || '清理缓存失败',
            duration: 5,
          })
        } finally {
          setOperationLoading(null)
        }
      },
    })
  }

  // 重建搜索索引（带确认）
  const handleRebuildSearchIndexAction = () => {
    Modal.confirm({
      title: '确认重建搜索索引',
      icon: <ExclamationCircleOutlined />,
      content: '重建索引需要一定时间，期间搜索功能可能受影响，确定要继续吗？',
      okText: '确认',
      cancelText: '取消',
      async onOk () {
        setOperationLoading('search')
        try {
          await handleRebuildSearchIndex()
          notification.success({
            message: '成功',
            description: '搜索索引重建成功！',
            duration: 3,
          })
        } catch (err: unknown) {
          const error = err as Error
          notification.error({
            message: '错误',
            description: error.message || '重建搜索索引失败',
            duration: 5,
          })
        } finally {
          setOperationLoading(null)
        }
      },
    })
  }

  // 刷新数据
  const handleRefreshData = async () => {
    try {
      await Promise.all([
        refetchDashboard(),
        refetchStats()
      ])
      notification.success({
        message: '成功',
        description: '数据刷新成功！',
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '数据刷新失败',
        duration: 5,
      })
    }
  }

  // 格式化运行时间
  const formatUptime = (uptimeStr: string) => {
    // 后端返回的是字符串格式，直接返回
    if (typeof uptimeStr === 'string') {
      return uptimeStr
    }
    // 如果是数字，转换为友好格式
    const seconds = Number(uptimeStr)
    if (isNaN(seconds)) return uptimeStr

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`
    } else {
      return `${minutes}分钟`
    }
  }

  // 计算内存使用率
  const calculateMemoryUsage = () => {
    if (!dashboard) return 0

    const parseMemory = (str: string) => {
      const num = parseFloat(str)
      return isNaN(num) ? 0 : num
    }

    const alloc = parseMemory(dashboard.memory.alloc)
    const sys = parseMemory(dashboard.memory.sys)

    if (sys === 0) return 0
    return Math.round((alloc / sys) * 100)
  }

  // 计算系统健康度
  const calculateSystemHealth = () => {
    if (!dashboard) {
      return {
        score: 0,
        status: 'unknown',
        color: '#d9d9d9',
        memoryUsage: 0,
        goroutineCount: 0
      }
    }

    const memoryUsage = calculateMemoryUsage()
    const goroutineCount = dashboard.goroutines

    let healthScore = 100

    // 内存使用率过高扣分
    if (memoryUsage > 80) healthScore -= 30
    else if (memoryUsage > 60) healthScore -= 15

    // Goroutine过多扣分
    if (goroutineCount > 1000) healthScore -= 20
    else if (goroutineCount > 500) healthScore -= 10

    let status: string
    let color: string
    if (healthScore >= 90) {
      status = '优秀'
      color = '#52c41a'
    } else if (healthScore >= 70) {
      status = '良好'
      color = '#1890ff'
    } else if (healthScore >= 50) {
      status = '警告'
      color = '#faad14'
    } else {
      status = '危险'
      color = '#ff4d4f'
    }

    return {
      score: Math.max(0, healthScore),
      status,
      color,
      memoryUsage,
      goroutineCount,
    }
  }

  // 准备内存使用图表数据
  const getMemoryChartData = () => {
    if (!dashboard) return []

    const parseMemory = (str: string) => {
      const num = parseFloat(str)
      return isNaN(num) ? 0 : num
    }

    return [
      {
        name: '当前分配',
        value: parseMemory(dashboard.memory.alloc),
        color: '#1890ff',
      },
      {
        name: '堆内存',
        value: parseMemory(dashboard.memory.heapAlloc),
        color: '#52c41a',
      },
      {
        name: '系统内存',
        value: parseMemory(dashboard.memory.sys),
        color: '#faad14',
      },
    ]
  }

  return (
    <div>
      {/* 页面头部 - 自动刷新开关 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tooltip title='每30秒自动刷新数据'>
            <span>自动刷新:</span>
          </Tooltip>
          <Switch
            checked={autoRefresh}
            onChange={setAutoRefresh}
            checkedChildren='开'
            unCheckedChildren='关'
          />
        </Space>
        <LiquidButton
          variant='secondary'
          onClick={handleRefreshData}
          loading={loading}
          className='!h-10 !px-4 flex items-center justify-center gap-2'
        >
          <ReloadOutlined spin={loading} /> 刷新数据
        </LiquidButton>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size='large' />
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <Alert
          message='加载失败'
          description={error.message}
          type='error'
          showIcon
          action={
            <LiquidButton
              variant='secondary'
              size='small'
              onClick={handleRefreshData}
              className='!h-8 !px-3'
            >
              重试
            </LiquidButton>
                    }
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* 系统健康度卡片 */}
      {dashboard && (() => {
        const health = calculateSystemHealth()
        return (
          <Card style={{ marginBottom: '24px', background: `linear-gradient(135deg, ${health.color}15 0%, ${health.color}05 100%)` }}>
            <Row gutter={16} align='middle'>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <Space>
                        <ThunderboltOutlined />
                        <span>系统健康度</span>
                      </Space>
                                    }
                  value={health.score}
                  suffix='/ 100'
                  valueStyle={{ color: health.color, fontSize: '36px', fontWeight: 'bold' }}
                />
                <Tag color={health.color} style={{ marginTop: '8px' }}>
                  {health.status}
                </Tag>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ marginBottom: '8px' }}>
                  <Text type='secondary'>内存使用率</Text>
                </div>
                <Progress
                  percent={health.memoryUsage}
                  status={health.memoryUsage > 80 ? 'exception' : health.memoryUsage > 60 ? 'normal' : 'success'}
                  strokeColor={
                                        health.memoryUsage > 80
                                          ? '#ff4d4f'
                                          : health.memoryUsage > 60 ? '#faad14' : '#52c41a'
                                    }
                />
              </Col>
              <Col xs={24} md={8}>
                <Descriptions column={1} size='small'>
                  <Descriptions.Item label='协程数'>
                    <Space>
                        <Text strong>{health.goroutineCount}</Text>
                        {health.goroutineCount > 500 && (
                            <Tooltip title='协程数较高，请注意监控'>
                                  <WarningOutlined style={{ color: '#faad14' }} />
                                </Tooltip>
                          )}
                      </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label='运行时间'>
                    <Text>{formatUptime(dashboard.uptime)}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        )
      })()}

      {/* 服务器信息 */}
      {dashboard && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {/* 基本信息 */}
          <Col xs={24} lg={12}>
            <Card title='服务器信息' variant='borderless'>
              <Descriptions column={1} layout='horizontal' size='small'>
                <Descriptions.Item label='主机名'>
                  <Text code>{dashboard.hostname}</Text>
                </Descriptions.Item>
                <Descriptions.Item label='Go版本'>
                  <Text code>{dashboard.goVersion}</Text>
                </Descriptions.Item>
                <Descriptions.Item label='CPU核心数'>
                  <Space>
                    <ClusterOutlined />
                    <span>{dashboard.cpuCount}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label='协程数'>
                  <Space>
                    <ApiOutlined />
                    <span>{dashboard.goroutines}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label='运行时间'>
                  <Space>
                    <ClockCircleOutlined />
                    <span>{formatUptime(dashboard.uptime)}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label='服务器时间'>
                  <Space>
                    <CalendarOutlined />
                    <span>{new Date(dashboard.serverTime).toLocaleString('zh-CN')}</span>
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 内存使用情况 - 图表展示 */}
          <Col xs={24} lg={12}>
            <Card title='内存使用情况' variant='borderless'>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={getMemoryChartData()}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='name'
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'MB', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${(Number(value) || 0).toFixed(2)} MB`, '内存']}
                  />
                  <Bar dataKey='value' radius={[8, 8, 0, 0]}>
                    {getMemoryChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px' }}>
                <Descriptions column={2} size='small'>
                  <Descriptions.Item label='累计分配'>
                    <Text code>{formatMemoryUsage(dashboard.memory.totalAlloc)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label='堆内存系统'>
                    <Text code>{formatMemoryUsage(dashboard.memory.heapSys)}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 统计信息 */}
      {dashboard && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} md={6}>
            <Card variant='borderless' styles={{ body: { padding: '24px' } }}>
              <Statistic
                title='总用户数'
                value={dashboard.userCount}
                valueStyle={{ color: '#4f46e5' }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card variant='borderless' styles={{ body: { padding: '24px' } }}>
              <Statistic
                title='总文章数'
                value={dashboard.postCount}
                valueStyle={{ color: '#10b981' }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card variant='borderless' styles={{ body: { padding: '24px' } }}>
              <Statistic
                title='今日注册'
                value={dashboard.todayRegistrations}
                valueStyle={{ color: '#f59e0b' }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card variant='borderless' styles={{ body: { padding: '24px' } }}>
              <Statistic
                title='今日文章'
                value={dashboard.todayPosts}
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* GitHub Pages 部署 */}
      <Card
        title={
          <Space>
            <GithubOutlined />
            <span>GitHub Pages 静态导出</span>
          </Space>
                }
        variant='borderless'
        style={{ marginBottom: '24px' }}
        extra={
                    !isEditing
                      ? (
                        <LiquidButton
                          variant='secondary'
                          size='small'
                          onClick={() => setIsEditing(true)}
                          className='!h-8 !px-3'
                        >
                          编辑配置
                        </LiquidButton>
                        )
                      : (
                        <Space>
                          <LiquidButton
                            variant='secondary'
                            size='small'
                            onClick={() => setIsEditing(false)}
                            className='!h-8 !px-3'
                          >
                            取消
                          </LiquidButton>
                          <LiquidButton
                            variant='primary'
                            size='small'
                            onClick={handleSaveConfig}
                            loading={operationLoading === 'github_config'}
                            className='!h-8 !px-3'
                          >
                            <SaveOutlined /> 保存
                          </LiquidButton>
                        </Space>
                        )
                }
      >
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <div style={{ marginBottom: '16px' }}>
              <Text type='secondary' style={{ display: 'block', marginBottom: '8px' }}>
                GitHub 仓库 (格式: 用户/仓库)
              </Text>
              <Input
                placeholder='例如: username/blog'
                value={editConfig.repo}
                onChange={e => setEditConfig({ ...editConfig, repo: e.target.value })}
                disabled={!isEditing}
                prefix={<GithubOutlined style={{ color: '#8c8c8c' }} />}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text type='secondary' style={{ display: 'block', marginBottom: '8px' }}>
                Personal Access Token
              </Text>
              <Input.Password
                placeholder='GitHub Token (需具有 repo 权限)'
                value={isEditing ? editConfig.token : '********************'}
                onChange={e => setEditConfig({ ...editConfig, token: e.target.value })}
                disabled={!isEditing}
                prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
              />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(24, 144, 255, 0.05)', height: '100%' }}>
              <Typography.Title level={5}>一键静态部署</Typography.Title>
              <p style={{ margin: '8px 0 16px', color: '#666' }}>
                点击下方按钮将当前所有公开文章导出为静态 JSON 并生成 HTML 站点，自动推送到 GitHub Pages。
              </p>
              <LiquidButton
                variant='primary'
                loading={operationLoading === 'deploy'}
                onClick={handleDeployAction}
                disabled={!githubConfig?.repo || !githubConfig?.token || !!operationLoading}
                className='!rounded-full flex items-center justify-center gap-2 !w-full !h-12'
              >
                <RocketOutlined /> {operationLoading === 'deploy' ? '部署中，请稍候...' : '立即同步到 GitHub Pages'}
              </LiquidButton>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 系统操作 */}
      <Card title='系统维护操作' variant='borderless' style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {/* 缓存管理 */}
          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <span>缓存管理</span>
                </Space>
                            }
            >
              <p style={{ marginBottom: '16px' }}>
                清理系统缓存可以释放内存，但可能会暂时影响性能。
              </p>
              <LiquidButton
                variant='danger'
                loading={operationLoading === 'cache'}
                onClick={handleClearCacheAction}
                disabled={!!operationLoading}
                className='!rounded-full flex items-center justify-center gap-2'
              >
                {operationLoading === 'cache' ? '清理中...' : '清理缓存'}
              </LiquidButton>
            </Card>
          </Col>

          {/* 搜索索引 */}
          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <DatabaseOutlined style={{ color: '#1890ff' }} />
                  <span>搜索索引</span>
                </Space>
                            }
            >
              <p style={{ marginBottom: '16px' }}>
                重建搜索索引可以提高搜索准确性，但需要一些时间完成。
              </p>
              <LiquidButton
                variant='primary'
                loading={operationLoading === 'search'}
                onClick={handleRebuildSearchIndexAction}
                disabled={!!operationLoading}
                className='!rounded-full flex items-center justify-center gap-2'
              >
                {operationLoading === 'search' ? '重建中...' : '重建索引'}
              </LiquidButton>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
