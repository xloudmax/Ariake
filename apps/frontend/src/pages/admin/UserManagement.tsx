import { useState } from 'react'
import {
  Input,
  Select,
  Table,
  Alert,
  Modal,
  Form,
  Card,
  Typography,
  Avatar,
  Tag,
  Statistic,
  Row,
  Col,
  notification,
  Dropdown,
  Space,
  Checkbox
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined
} from '@ant-design/icons'
import { useUserAdmin, useAdminNavigation } from '../../hooks'
import { useAppUser } from '../../hooks'
import { UserRole, AdminCreateUserInput } from '../../generated/graphql'

const { Text } = Typography
const { Option } = Select

// 用户类型定义
interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  avatar?: string;
  bio?: string;
  lastLoginAt?: string;
  createdAt: string;
  postsCount?: number;
}

export default function UserManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()

  const {
    users,
    userStats,
    loading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    verifiedFilter,
    setVerifiedFilter,
    createUser,
    updateUser,
    deleteUser,
    batchUpdateUsers,
    refetch
  } = useUserAdmin()

  // 本地状态
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [newUserData, setNewUserData] = useState<AdminCreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'USER' as UserRole,
    isVerified: false
  })

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert message='您需要管理员权限才能访问此页面' type='warning' showIcon />
    )
  }

  // 创建用户
  const handleCreateUser = async () => {
    try {
      await createUser(newUserData)
      setShowCreateModal(false)
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: 'USER' as UserRole,
        isVerified: false
      })
      notification.success({
        message: '成功',
        description: '用户创建成功',
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '创建用户失败',
        duration: 5,
      })
    }
  }

  // 更新用户
  const handleUpdateUser = async () => {
    if (!currentUser) return

    try {
      await updateUser(currentUser.id, {
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        isVerified: currentUser.isVerified,
        isActive: currentUser.isActive
      })
      setShowEditModal(false)
      setCurrentUser(null)
      notification.success({
        message: '成功',
        description: '用户更新成功',
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '更新用户失败',
        duration: 5,
      })
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      await deleteUser(userId)
      notification.success({
        message: '成功',
        description: `用户 "${username}" 删除成功`,
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '删除用户失败',
        duration: 5,
      })
    }
  }

  // 批量操作
  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'verify' | 'unverify') => {
    if (selectedUsers.length === 0) {
      notification.warning({
        message: '警告',
        description: '请先选择要操作的用户',
        duration: 3,
      })
      return
    }

    const updates: Record<string, unknown> = {}
    switch (action) {
      case 'activate':
        updates.isActive = true
        break
      case 'deactivate':
        updates.isActive = false
        break
      case 'verify':
        updates.isVerified = true
        break
      case 'unverify':
        updates.isVerified = false
        break
    }

    try {
      await batchUpdateUsers(selectedUsers, updates)
      setSelectedUsers([])
      notification.success({
        message: '成功',
        description: '批量操作成功',
        duration: 3,
      })
    } catch (err: unknown) {
      const error = err as Error
      notification.error({
        message: '错误',
        description: error.message || '批量操作失败',
        duration: 5,
      })
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className='space-y-6'>
      {/* 统计信息 */}
      <div>
        <Row gutter={16}>
          <Col span={6}>
            <Card className='optimized-card'>
              <Statistic title='总用户数' value={userStats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className='optimized-card'>
              <Statistic title='管理员' value={userStats.admins} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className='optimized-card'>
              <Statistic
                title='已验证' value={userStats.verified}
                suffix={`(${userStats.verificationRate.toFixed(1)}%)`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className='optimized-card'>
              <Statistic
                title='活跃用户' value={userStats.active}
                suffix={`(${userStats.activeRate.toFixed(1)}%)`}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 操作栏 */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-4'>
          {/* 搜索框 */}
          <Input
            placeholder='搜索用户名或邮箱...'
            prefix={<SearchOutlined />}
            style={{ width: 256 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='optimized-input'
          />

          {/* 筛选器 */}
          <Select
            style={{ width: 120 }}
            value={roleFilter || undefined}
            onChange={(value) => setRoleFilter(value as UserRole || undefined)}
            placeholder='全部角色'
            className='optimized-input'
          >
            <Option value={undefined}>全部角色</Option>
            <Option value={'USER' as UserRole}>普通用户</Option>
            <Option value={'ADMIN' as UserRole}>管理员</Option>
          </Select>

          <Select
            style={{ width: 120 }}
            value={verifiedFilter}
            onChange={(value) => setVerifiedFilter(value)}
            placeholder='全部状态'
            className='optimized-input'
          >
            <Option value={undefined}>全部状态</Option>
            <Option value>已验证</Option>
            <Option value={false}>未验证</Option>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          {/* 批量操作 */}
          {selectedUsers.length > 0 && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'activate',
                    label: '激活用户',
                    onClick: () => handleBatchAction('activate')
                  },
                  {
                    key: 'deactivate',
                    label: '停用用户',
                    onClick: () => handleBatchAction('deactivate')
                  },
                  {
                    key: 'verify',
                    label: '验证邮箱',
                    onClick: () => handleBatchAction('verify')
                  },
                  {
                    key: 'unverify',
                    label: '取消验证',
                    onClick: () => handleBatchAction('unverify')
                  }
                ]
              }}
            >
              <LiquidButton variant='secondary' className='!rounded-full flex items-center justify-center gap-2'>
                批量操作 ({selectedUsers.length})
              </LiquidButton>
            </Dropdown>
          )}

          {/* 创建用户按钮 */}
          <LiquidButton
            variant='primary'
            onClick={() => setShowCreateModal(true)}
            className='!rounded-full flex items-center justify-center gap-2'
          >
            <PlusOutlined /> 创建用户
          </LiquidButton>
        </div>
      </div>

      {/* 用户列表 */}
      {loading
        ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div className='loading-spinner' />
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
            <Table
              rowKey='id'
              dataSource={users}
              columns={[
                {
                  title: '用户信息',
                  key: 'userInfo',
                  render: (_, user: User) => (
                    <div className='user-table-info'>
                      {user.avatar && (
                        <Avatar src={user.avatar} size={48} shape='square' />
                      )}
                      <div className='user-table-details'>
                        <div className='user-table-name'>{user.username}</div>
                        <Text type='secondary'>{user.email}</Text>
                      </div>
                    </div>
                  )
                },
                {
                  title: '角色',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role: UserRole) => (
                    <Tag color={role === 'ADMIN' ? 'red' : 'default'} className='rounded-full'>
                      {role === 'ADMIN' ? '管理员' : '用户'}
                    </Tag>
                  )
                },
                {
                  title: '状态',
                  key: 'status',
                  render: (_, user: User) => (
                    <Space direction='vertical' size='small'>
                      <Tag color={user.isVerified ? 'green' : 'orange'} className='rounded-full'>
                        {user.isVerified ? '已验证' : '未验证'}
                      </Tag>
                      <Tag color={user.isActive ? 'blue' : 'red'} className='rounded-full'>
                        {user.isActive ? '活跃' : '停用'}
                      </Tag>
                    </Space>
                  )
                },
                {
                  title: '文章数',
                  dataIndex: 'postsCount',
                  key: 'postsCount',
                  render: (postsCount: number) => postsCount || 0
                },
                {
                  title: '最后登录',
                  dataIndex: 'lastLoginAt',
                  key: 'lastLoginAt',
                  render: (lastLoginAt: string) => lastLoginAt ? formatDate(lastLoginAt) : '从未登录'
                },
                {
                  title: '注册时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (createdAt: string) => formatDate(createdAt)
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, user: User) => (
                    <div className='user-table-actions flex items-center gap-2'>
                      <LiquidButton
                        variant='ghost'
                        size='small'
                        onClick={() => {
                            setCurrentUser(user)
                            setShowEditModal(true)
                          }}
                        className='!h-8 !px-2 text-blue-500 hover:text-blue-600'
                      >
                                      编辑
                      </LiquidButton>
                      <LiquidButton
                        variant='danger'
                        size='small'
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className='!h-8 !px-2 !bg-transparent !text-red-500 !border-none !shadow-none hover:!text-red-600'
                      >
                                      删除
                      </LiquidButton>
                    </div>
                  )
                }
              ]}
              rowSelection={{
                selectedRowKeys: selectedUsers,
                onChange: (selectedRowKeys) => setSelectedUsers(selectedRowKeys as string[])
              }}
              pagination={false}
              className='optimized-card'
            />
            )}

      {/* 创建用户模态框 */}
      <Modal
        title='创建新用户'
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={[
          <LiquidButton key='cancel' variant='secondary' onClick={() => setShowCreateModal(false)} className='!h-10 !px-6'>
            取消
          </LiquidButton>,
          <LiquidButton
            key='create'
            variant='primary'
            disabled={!newUserData.username || !newUserData.email || !newUserData.password}
            loading={loading}
            onClick={handleCreateUser}
            className='!h-10 !px-8'
          >
            创建
          </LiquidButton>
        ]}
      >
        <Form layout='vertical'>
          <Form.Item label='用户名' required>
            <Input
              placeholder='用户名'
              value={newUserData.username}
              onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
              prefix={<UserOutlined />}
              className='optimized-input'
            />
          </Form.Item>
          <Form.Item label='邮箱' required>
            <Input
              type='email'
              placeholder='邮箱'
              value={newUserData.email}
              onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
              prefix={<MailOutlined />}
              className='optimized-input'
            />
          </Form.Item>
          <Form.Item label='密码' required>
            <Input.Password
              placeholder='密码'
              value={newUserData.password}
              onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
              prefix={<LockOutlined />}
              className='optimized-input'
            />
          </Form.Item>
          <Form.Item label='角色'>
            <Select
              value={newUserData.role}
              onChange={(value: UserRole) => setNewUserData(prev => ({ ...prev, role: value }))}
              className='optimized-input'
            >
              <Option value={'USER' as UserRole}>普通用户</Option>
              <Option value={'ADMIN' as UserRole}>管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={newUserData.isVerified || false}
              onChange={(e) => setNewUserData(prev => ({ ...prev, isVerified: e.target.checked }))}
            >
              邮箱已验证
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        title='编辑用户'
        open={showEditModal && !!currentUser}
        onCancel={() => {
          setShowEditModal(false)
          setCurrentUser(null)
        }}
        footer={[
          <LiquidButton
            key='cancel'
            variant='secondary'
            onClick={() => {
              setShowEditModal(false)
              setCurrentUser(null)
            }}
            className='!h-10 !px-6'
          >
            取消
          </LiquidButton>,
          <LiquidButton
            key='save'
            variant='primary'
            loading={loading}
            onClick={handleUpdateUser}
            className='!h-10 !px-8'
          >
            保存
          </LiquidButton>
        ]}
      >
        {currentUser && (
          <Form layout='vertical'>
            <Form.Item label='用户名' required>
              <Input
                placeholder='用户名'
                value={currentUser.username}
                onChange={(e) => setCurrentUser((prev: User | null) => prev
                  ? ({
                      ...prev,
                      username: e.target.value
                    })
                  : null)}
                prefix={<UserOutlined />}
                className='optimized-input'
              />
            </Form.Item>
            <Form.Item label='邮箱' required>
              <Input
                type='email'
                placeholder='邮箱'
                value={currentUser.email}
                onChange={(e) => setCurrentUser((prev: User | null) => prev
                  ? ({
                      ...prev,
                      email: e.target.value
                    })
                  : null)}
                prefix={<MailOutlined />}
                className='optimized-input'
              />
            </Form.Item>
            <Form.Item label='角色'>
              <Select
                value={currentUser.role}
                onChange={(value: UserRole) => setCurrentUser((prev: User | null) => prev
                  ? ({
                      ...prev,
                      role: value
                    })
                  : null)}
                className='optimized-input'
              >
                <Option value={'USER' as UserRole}>普通用户</Option>
                <Option value={'ADMIN' as UserRole}>管理员</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={currentUser.isVerified}
                onChange={(e) => setCurrentUser((prev: User | null) => prev
                  ? ({
                      ...prev,
                      isVerified: e.target.checked
                    })
                  : null)}
              >
                邮箱已验证
              </Checkbox>
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={currentUser.isActive}
                onChange={(e) => setCurrentUser((prev: User | null) => prev
                  ? ({
                      ...prev,
                      isActive: e.target.checked
                    })
                  : null)}
              >
                账户激活
              </Checkbox>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
