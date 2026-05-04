import React, { useState } from 'react'
import { useInviteAdmin, useAdminNavigation } from '@/hooks'
import { useAppUser } from '@/hooks'
// 导入Ant Design组件
import {
  Card,
  Table,
  Modal,
  Input,
  InputNumber,
  Select,
  Alert,
  Spin,
  Statistic,
  Row,
  Col,
  Typography,
  Popconfirm,
  notification,
  Space
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  StopOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { CreateInviteCodeInput } from '@/generated/graphql'

const { Text } = Typography
const { Option } = Select

// 邀请码类型定义
interface InviteCode {
  id: string;
  code: string;
  description?: string;
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  expiresAt?: string | null;
  createdAt: string;
  usedAt?: string | null;
  createdBy?: {
    username: string;
  };
  usedBy?: {
    username: string;
  };
}

export default function InviteCodeManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()

  const {
    inviteCodes,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    createInviteCode: handleCreateInviteCode,
    deactivateInviteCode: handleDeactivateInviteCode,
    batchDeactivate: handleBatchDeactivate,
    loadMore,
    refetch
  } = useInviteAdmin()

  // 本地状态
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCodeData, setNewCodeData] = useState({
    description: '',
    maxUses: 1,
    expiresAt: ''
  })

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

  // 创建邀请码
  const handleCreate = async () => {
    try {
      // 处理到期时间
      const createData: Partial<CreateInviteCodeInput> = {
        description: newCodeData.description || undefined,
        maxUses: newCodeData.maxUses,
      }

      if (newCodeData.expiresAt) {
        createData.expiresAt = new Date(newCodeData.expiresAt).toISOString()
      }

      await handleCreateInviteCode(createData as CreateInviteCodeInput)

      setShowCreateModal(false)
      setNewCodeData({
        description: '',
        maxUses: 1,
        expiresAt: ''
      })
      notification.success({
        message: '成功',
        description: '邀请码创建成功',
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '创建邀请码失败',
        duration: 5,
      })
    }
  }

  // 停用邀请码
  const handleDeactivate = async (id: string, code: string) => {
    try {
      await handleDeactivateInviteCode(id)
      notification.success({
        message: '成功',
        description: `邀请码 "${code}" 已停用`,
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '停用邀请码失败',
        duration: 5,
      })
    }
  }

  // 批量停用
  const handleBatchDeactivateSelected = async () => {
    if (selectedCodes.length === 0) {
      notification.warning({
        message: '警告',
        description: '请先选择要停用的邀请码',
        duration: 3,
      })
      return
    }

    try {
      await handleBatchDeactivate(selectedCodes)
      setSelectedCodes([])
      notification.success({
        message: '成功',
        description: `成功停用 ${selectedCodes.length} 个邀请码`,
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '批量停用失败',
        duration: 5,
      })
    }
  }

  // 格式化日期
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '永不过期'
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 检查是否过期
  const isExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  // 检查是否已用完
  const isExhausted = (currentUses: number, maxUses: number) => {
    return currentUses >= maxUses
  }

  // 表格列定义
  const columns = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text code>{code}</Text>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '无描述'
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: InviteCode) => {
        const expired = isExpired(record.expiresAt)
        const exhausted = isExhausted(record.currentUses, record.maxUses)

        let statusText, statusType
        if (!record.isActive) {
          statusText = '已停用'
          statusType = 'error'
        } else if (expired) {
          statusText = '已过期'
          statusType = 'warning'
        } else if (exhausted) {
          statusText = '已用完'
          statusType = 'processing'
        } else {
          statusText = '激活中'
          statusType = 'success'
        }

        return (
          <Space>
            {statusType === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
            {statusType === 'warning' && <WarningOutlined style={{ color: '#faad14' }} />}
            {statusType === 'processing' && <InfoCircleOutlined style={{ color: '#1890ff' }} />}
            {statusType === 'error' && <StopOutlined style={{ color: '#ff4d4f' }} />}
            <Text
              type={statusType === 'error' ? 'danger' : statusType === 'warning' ? 'warning' : undefined}
            >{statusText}
            </Text>
          </Space>
        )
      }
    },
    {
      title: '使用情况',
      key: 'usage',
      render: (_: unknown, record: InviteCode) => {
        const exhausted = isExhausted(record.currentUses, record.maxUses)
        return (
          <Text type={exhausted ? 'warning' : undefined}>
            {record.currentUses} / {record.maxUses}
          </Text>
        )
      }
    },
    {
      title: '创建者',
      dataIndex: ['createdBy', 'username'],
      key: 'createdBy',
      render: (username: string) => username || '系统'
    },
    {
      title: '使用者',
      key: 'usedBy',
      render: (_: unknown, record: InviteCode) => {
        if (record.usedBy) {
          return (
            <div>
              <div>{record.usedBy.username}</div>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {formatDate(record.usedAt)}
              </Text>
            </div>
          )
        }
        return <Text type='secondary'>未使用</Text>
      }
    },
    {
      title: '到期时间',
      key: 'expiresAt',
      render: (_: unknown, record: InviteCode) => {
        const expired = isExpired(record.expiresAt)
        return (
          <Text type={expired ? 'warning' : undefined}>
            {formatDate(record.expiresAt)}
          </Text>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => formatDate(createdAt)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: InviteCode) => {
        const expired = isExpired(record.expiresAt)
        const exhausted = isExhausted(record.currentUses, record.maxUses)

        if (record.isActive && !expired && !exhausted) {
          return (
            <Popconfirm
              title='确认停用'
              description={`确定要停用邀请码 "${record.code}" 吗？`}
              onConfirm={() => handleDeactivate(record.id, record.code)}
              okText='确认'
              cancelText='取消'
            >
              <LiquidButton
                variant='danger'
                size='small'
                className='!h-8 !px-2 !bg-transparent !text-red-500 !border-none !shadow-none hover:!text-red-600 flex items-center gap-1'
              >
                <DeleteOutlined /> 停用
              </LiquidButton>
            </Popconfirm>
          )
        }
        return null
      }
    }
  ]

  // 选择行的配置
  const rowSelection = {
    selectedRowKeys: selectedCodes,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedCodes(selectedRowKeys as string[])
    }
  }

  return (
    <div>
      {/* 统计信息 */}
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title='总邀请码' value={inviteCodes.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title='激活中'
                value={inviteCodes.filter((code: InviteCode) => code.isActive).length}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title='已使用'
                value={inviteCodes.filter((code: InviteCode) => code.usedAt).length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title='已过期'
                value={inviteCodes.filter((code: InviteCode) => isExpired(code.expiresAt)).length}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 操作栏 */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 筛选器 */}
          <Select
            style={{ width: 120 }}
            value={activeFilter?.toString() || ''}
            onChange={(value) => setActiveFilter(value === '' ? undefined : value === 'true')}
            placeholder='全部状态'
          >
            <Option value=''>全部状态</Option>
            <Option value='true'>激活中</Option>
            <Option value='false'>已停用</Option>
          </Select>

          {/* 刷新按钮 */}
          <LiquidButton
            variant='secondary'
            onClick={() => refetch()}
            disabled={loading}
            className='!rounded-full flex items-center justify-center gap-2'
          >
            <ReloadOutlined /> 刷新
          </LiquidButton>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 批量操作 */}
          {selectedCodes.length > 0 && (
            <Popconfirm
              title='确认批量停用'
              description={`确定要停用选中的 ${selectedCodes.length} 个邀请码吗？`}
              onConfirm={handleBatchDeactivateSelected}
              okText='确认'
              cancelText='取消'
            >
              <LiquidButton variant='danger' className='!rounded-full flex items-center justify-center gap-2'>
                批量停用 ({selectedCodes.length})
              </LiquidButton>
            </Popconfirm>
          )}

          {/* 创建邀请码按钮 */}
          <LiquidButton
            variant='primary'
            onClick={() => setShowCreateModal(true)}
            className='!rounded-full flex items-center justify-center gap-2'
          >
            <PlusOutlined /> 创建邀请码
          </LiquidButton>
        </div>
      </div>

      {/* 邀请码列表 */}
      {loading
        ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size='large' />
          </div>
          )
        : error
          ? (
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
          : (
            <Card>
              <Table
                rowKey='id'
                dataSource={inviteCodes}
                columns={columns}
                rowSelection={rowSelection}
                pagination={false}
                loading={loading}
              />
            </Card>
            )}

      {/* 加载更多 */}
      {inviteCodes.length > 0 && !loading && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <LiquidButton variant='secondary' onClick={() => loadMore()} className='!rounded-full px-8'>
            加载更多
          </LiquidButton>
        </div>
      )}

      {/* 创建邀请码模态框 */}
      <Modal
        title='创建新邀请码'
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={[
          <LiquidButton key='cancel' variant='secondary' onClick={() => setShowCreateModal(false)} className='!h-10 !px-6'>
            取消
          </LiquidButton>,
          <LiquidButton
            key='create'
            variant='primary'
            disabled={(newCodeData.maxUses || 0) < 1}
            loading={loading}
            onClick={handleCreate}
            className='!h-10 !px-8'
          >
            创建
          </LiquidButton>
        ]}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text strong>描述</Text>
            <Input
              placeholder='邀请码描述（可选）'
              value={newCodeData.description || ''}
              onChange={(e) => setNewCodeData(prev => ({ ...prev, description: e.target.value }))}
              prefix={<UserOutlined />}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text strong>最大使用次数</Text>
            <InputNumber
              min={1}
              placeholder='1'
              style={{ width: '100%' }}
              value={newCodeData.maxUses}
              onChange={(value) => setNewCodeData(prev => ({ ...prev, maxUses: value || 1 }))}
            />
          </div>

          <div>
            <Text strong>到期时间（可选）</Text>
            <Input
              type='datetime-local'
              style={{ width: '100%' }}
              value={newCodeData.expiresAt}
              onChange={(e) => setNewCodeData(prev => ({ ...prev, expiresAt: e.target.value }))}
              prefix={<CalendarOutlined />}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              留空表示永不过期
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}
