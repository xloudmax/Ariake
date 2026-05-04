import { useState } from 'react'
import {
  Table,
  Tag,
  Space,
  Select,
  Modal,
  Typography,
  Avatar,
  Tooltip,
  notification,
  Row,
  Col,
  Statistic,
  Alert
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  MessageOutlined
} from '@ant-design/icons'
import { useAppUser } from '@/hooks'
import { useAdminNavigation } from '@/hooks/useAdmin'
import { useAdminComments, useCommentModeration } from '@/api/graphql/admin'
import { useCommentActions } from '@/api/graphql/comment'
import { Link } from 'react-router-dom'

const { Text } = Typography
const { Option } = Select

interface Comment {
  id: string;
  content: string;
  isApproved: boolean;
  likeCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  blogPost: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function CommentManagement () {
  const { isAdmin } = useAppUser()
  const { checkAdminAccess } = useAdminNavigation()

  // 筛选状态
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'reported'>('all')

  // 根据筛选状态构建 filter 参数
  const getFilter = () => {
    if (filterStatus === 'pending') return { isApproved: false }
    if (filterStatus === 'approved') return { isApproved: true }
    return undefined
  }

  // 获取评论数据
  const { comments, total, loading, error, refetch } = useAdminComments(getFilter())
  const { approveComment, rejectComment, loading: moderationLoading } = useCommentModeration()
  const { deleteComment, loading: deleteLoading } = useCommentActions()

  // 权限检查
  if (!isAdmin || !checkAdminAccess()) {
    return (
      <Alert message='您需要管理员权限才能访问此页面' type='warning' showIcon />
    )
  }

  // 处理批准评论
  const handleApprove = async (id: string) => {
    try {
      await approveComment(id)
      notification.success({
        message: '成功',
        description: '评论已批准',
        duration: 3,
      })
      refetch()
    } catch {
      notification.error({
        message: '错误',
        description: '批准评论失败',
        duration: 5,
      })
    }
  }

  // 处理拒绝评论
  const handleReject = async (id: string) => {
    try {
      await rejectComment(id)
      notification.success({
        message: '成功',
        description: '评论已拒绝',
        duration: 3,
      })
      refetch()
    } catch {
      notification.error({
        message: '错误',
        description: '拒绝评论失败',
        duration: 5,
      })
    }
  }

  // 处理删除评论
  const handleDelete = (id: string, content: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除这条评论吗？\n\n"${content.substring(0, 50)}..."`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk () {
        try {
          await deleteComment(id)
          notification.success({
            message: '成功',
            description: '评论已删除',
            duration: 3,
          })
          refetch()
        } catch {
          notification.error({
            message: '错误',
            description: '删除评论失败',
            duration: 5,
          })
        }
      },
    })
  }

  // 筛选后的评论（用于被举报的评论）
  const filteredComments = filterStatus === 'reported'
    ? comments.filter((c: Comment) => c.reportCount > 0)
    : comments

  // 统计数据
  const pendingCount = comments.filter((c: Comment) => !c.isApproved).length
  const reportedCount = comments.filter((c: Comment) => c.reportCount > 0).length

  // 表格列定义
  const columns = [
    {
      title: '作者',
      dataIndex: ['user', 'username'],
      key: 'user',
      width: 150,
      render: (_: string, record: Comment) => (
        <Space>
          <Avatar
            src={record.user.avatar}
            icon={<UserOutlined />}
            size='small'
          />
          <Text>{record.user.username}</Text>
        </Space>
      ),
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <Text ellipsis>{content}</Text>
        </Tooltip>
      ),
    },
    {
      title: '文章',
      dataIndex: ['blogPost', 'title'],
      key: 'post',
      width: 200,
      render: (_: string, record: Comment) => (
        <Link to={`/post/${record.blogPost.slug}`}>
          <Space>
            <FileTextOutlined />
            <Text ellipsis style={{ maxWidth: 150 }}>
              {record.blogPost.title}
            </Text>
          </Space>
        </Link>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isApproved',
      key: 'status',
      width: 100,
      render: (isApproved: boolean) => (
        <Tag color={isApproved ? 'green' : 'orange'}>
          {isApproved ? '已批准' : '待审核'}
        </Tag>
      ),
    },
    {
      title: '点赞',
      dataIndex: 'likeCount',
      key: 'likes',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '举报',
      dataIndex: 'reportCount',
      key: 'reports',
      width: 80,
      align: 'center' as const,
      render: (count: number) => (
        <Text type={count > 0 ? 'danger' : undefined}>
          {count}
        </Text>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => (
        <Text type='secondary'>
          {new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: Comment) => (
        <Space size='small'>
          {!record.isApproved && (
            <Tooltip title='批准'>
              <LiquidButton
                variant='primary'
                size='small'
                onClick={() => handleApprove(record.id)}
                loading={moderationLoading.approve}
                className='!h-8 flex items-center gap-1'
              >
                <CheckCircleOutlined /> 批准
              </LiquidButton>
            </Tooltip>
          )}
          {record.isApproved && (
            <Tooltip title='拒绝'>
              <LiquidButton
                variant='secondary'
                size='small'
                onClick={() => handleReject(record.id)}
                loading={moderationLoading.reject}
                className='!h-8 flex items-center gap-1'
              >
                <CloseCircleOutlined /> 拒绝
              </LiquidButton>
            </Tooltip>
          )}
          <Tooltip title='删除'>
            <LiquidButton
              variant='danger'
              size='small'
              onClick={() => handleDelete(record.id, record.content)}
              loading={deleteLoading.delete}
              className='!h-8 !w-8 !p-0 !bg-transparent !border-none !shadow-none flex items-center justify-center text-red-500 hover:text-red-600'
            >
              <DeleteOutlined />
            </LiquidButton>
          </Tooltip>
        </Space>
      ),
    },
  ]

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

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Statistic
            title='总评论数'
            value={total}
            prefix={<MessageOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title='待审核'
            value={pendingCount}
            valueStyle={{ color: '#faad14' }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title='被举报'
            value={reportedCount}
            valueStyle={{ color: reportedCount > 0 ? '#ff4d4f' : undefined }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 筛选器 */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Text>筛选状态：</Text>
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 150 }}
        >
          <Option value='all'>全部</Option>
          <Option value='pending'>待审核</Option>
          <Option value='approved'>已批准</Option>
          <Option value='reported'>被举报</Option>
        </Select>
        <Text type='secondary'>
          显示 {filteredComments.length} 条评论
        </Text>
      </div>

      {/* 评论表格 */}
      <Table
        columns={columns}
        dataSource={filteredComments}
        loading={loading}
        rowKey='id'
        pagination={{
          total: filteredComments.length,
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  )
}
