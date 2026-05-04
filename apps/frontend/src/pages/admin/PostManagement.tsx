import React, { useState, useCallback } from 'react'
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Popconfirm,
  message,
  Avatar,
  Typography,
  Tooltip,
  Badge,
  Spin
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LockOutlined,
  FileDoneOutlined
} from '@ant-design/icons'
import { usePostsQuery, usePostQuery, useUpdatePostMutation, useDeletePostMutation } from '@/generated/graphql'
import type { UpdatePostInput, PostStatus, AccessLevel, BlogPost as Post } from '@/generated/graphql'
import dayjs from 'dayjs'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

const PostManagement: React.FC = () => {
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [form] = Form.useForm()

  // GraphQL hooks
  const { data: postsData, loading, refetch } = usePostsQuery({
    variables: { limit: 50, offset: 0 },
    errorPolicy: 'all'
  })

  // 获取单个文章详情（包含完整content）
  const { data: postDetailData, loading: loadingDetail } = usePostQuery({
    variables: { id: editingPostId || '' },
    skip: !editingPostId,
    errorPolicy: 'all'
  })

  const [updatePost, { loading: updateLoading }] = useUpdatePostMutation()
  const [deletePost, { loading: deleteLoading }] = useDeletePostMutation()

  // 当文章详情加载完成时，填充表单
  React.useEffect(() => {
    if (postDetailData?.post && isEditModalOpen) {
      const post = postDetailData.post
      form.setFieldsValue({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        tags: post.tags,
        categories: post.categories,
        status: post.status,
        accessLevel: post.accessLevel,
        coverImageUrl: post.coverImageUrl
      })
      setEditingPost(post as Partial<Post>)
    }
  }, [postDetailData, isEditModalOpen, form])

  // 打开编辑模态框
  const handleEdit = useCallback((post: Partial<Post>) => {
    if (post.id) {
      setEditingPostId(post.id)
      setIsEditModalOpen(true)
    }
  }, [])

  // 关闭编辑模态框
  const handleCloseEdit = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingPost(null)
    setEditingPostId(null)
    form.resetFields()
  }, [form])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingPost?.id) return
    try {
      const values = await form.validateFields()
      const updateInput: UpdatePostInput = {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        tags: values.tags,
        categories: values.categories,
        status: values.status,
        accessLevel: values.accessLevel,
        coverImageUrl: values.coverImageUrl || undefined,
        changeLog: '管理员编辑'
      }

      await updatePost({
        variables: {
          id: editingPost.id,
          input: updateInput
        }
      })

      message.success('文章更新成功')
      handleCloseEdit()
      refetch()
    } catch {
      message.error('更新文章失败')
    }
  }, [form, editingPost, updatePost, refetch, handleCloseEdit])

  // 删除文章
  const handleDelete = useCallback(async (postId: string, postTitle: string) => {
    try {
      await deletePost({
        variables: { id: postId }
      })
      message.success(`文章 "${postTitle}" 删除成功`)
      refetch()
    } catch {
      message.error('删除文章失败')
    }
  }, [deletePost, refetch])

  // 状态标签渲染
  const renderStatusTag = (status: PostStatus) => {
    const statusConfig = {
      DRAFT: { color: 'orange', icon: <FileDoneOutlined />, text: '草稿' },
      PUBLISHED: { color: 'green', icon: <GlobalOutlined />, text: '已发布' },
      ARCHIVED: { color: 'red', icon: <FileTextOutlined />, text: '已归档' }
    }
    const config = statusConfig[status] || statusConfig.DRAFT
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 访问级别标签渲染
  const renderAccessLevelTag = (accessLevel: AccessLevel) => {
    const accessConfig = {
      PUBLIC: { color: 'blue', icon: <GlobalOutlined />, text: '公开' },
      PRIVATE: { color: 'red', icon: <LockOutlined />, text: '私有' },
      RESTRICTED: { color: 'orange', icon: <UserOutlined />, text: '受限' }
    }
    const config = accessConfig[accessLevel] || accessConfig.PUBLIC
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 表格列定义
  const columns = [
    {
      title: '文章信息',
      key: 'info',
      width: 300,
      render: (record: Post) => (
        <div>
          <div className='flex items-start space-x-3'>
            {record.coverImageUrl && (
              <Avatar
                src={record.coverImageUrl}
                shape='square'
                size={48}
                icon={<FileTextOutlined />}
              />
            )}
            <div className='flex-1 min-w-0'>
              <Tooltip title={record.title}>
                <Text strong className='block truncate'>
                  {record.title}
                </Text>
              </Tooltip>
              {record.excerpt && (
                <Tooltip title={record.excerpt}>
                  <Text type='secondary' className='block text-xs truncate mt-1'>
                    {record.excerpt}
                  </Text>
                </Tooltip>
              )}
              <div className='flex items-center space-x-2 mt-1'>
                <Badge
                  count={record.stats?.viewCount || 0}
                  style={{ backgroundColor: '#1890ff' }}
                  size='small'
                />
                <Text type='secondary' className='text-xs'>浏览</Text>
                <Badge
                  count={record.stats?.likeCount || 0}
                  style={{ backgroundColor: '#52c41a' }}
                  size='small'
                />
                <Text type='secondary' className='text-xs'>点赞</Text>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '作者',
      key: 'author',
      width: 120,
      render: (record: Post) => (
        <div className='flex items-center space-x-2'>
          <Avatar size='small' src={record.author?.avatar} icon={<UserOutlined />} />
          <Text className='text-sm'>{record.author?.username}</Text>
        </div>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (record: Post) => (
        <Space direction='vertical' size='small'>
          {renderStatusTag(record.status)}
          {renderAccessLevelTag(record.accessLevel)}
        </Space>
      )
    },
    {
      title: '标签分类',
      key: 'tags',
      width: 200,
      render: (record: Post) => (
        <div>
          <div className='mb-1'>
            {record.tags?.slice(0, 2).map((tag: string, index: number) => (
              <Tag key={index} color='blue'>
                {tag}
              </Tag>
            ))}
            {record.tags?.length > 2 && (
              <Tag>+{record.tags.length - 2}</Tag>
            )}
          </div>
          <div>
            {record.categories?.slice(0, 2).map((category: string, index: number) => (
              <Tag key={index} color='green'>
                {category}
              </Tag>
            ))}
            {record.categories?.length > 2 && (
              <Tag>+{record.categories.length - 2}</Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: '时间',
      key: 'time',
      width: 150,
      render: (record: Post) => (
        <div>
          <div className='flex items-center space-x-1 mb-1'>
            <CalendarOutlined className='text-xs text-gray-400' />
            <Text className='text-xs'>
              创建: {dayjs(record.createdAt).format('MM-DD HH:mm')}
            </Text>
          </div>
          {record.publishedAt && (
            <div className='flex items-center space-x-1'>
              <GlobalOutlined className='text-xs text-gray-400' />
              <Text className='text-xs'>
                发布: {dayjs(record.publishedAt).format('MM-DD HH:mm')}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Post) => (
        <Space>
          <Tooltip title='查看'>
            <LiquidButton
              variant='ghost'
              className='!h-8 !w-8 !p-0 flex items-center justify-center'
              onClick={() => window.open(`/post/${record.slug}`, '_blank')}
            >
              <EyeOutlined />
            </LiquidButton>
          </Tooltip>
          <Tooltip title='编辑'>
            <LiquidButton
              variant='ghost'
              className='!h-8 !w-8 !p-0 flex items-center justify-center'
              onClick={() => handleEdit(record)}
            >
              <EditOutlined />
            </LiquidButton>
          </Tooltip>
          <Popconfirm
            title='确认删除'
            description={`确定要删除文章 "${record.title}" 吗？此操作不可撤销。`}
            onConfirm={() => handleDelete(record.id, record.title)}
            okText='删除'
            cancelText='取消'
            okType='danger'
          >
            <Tooltip title='删除'>
              <LiquidButton
                variant='danger'
                className='!h-8 !w-8 !p-0 !bg-transparent !border-none !shadow-none flex items-center justify-center'
                loading={deleteLoading}
              >
                <DeleteOutlined />
              </LiquidButton>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const posts = postsData?.posts || []

  return (
    <div>
      <div className='mb-4'>
        <Text type='secondary'>
          共 {posts.length} 篇文章
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={posts}
        rowKey='id'
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
        }}
        scroll={{ x: 1200 }}
      />

      {/* 编辑模态框 */}
      <Modal
        title={
          <div className='flex items-center space-x-2'>
            <EditOutlined />
            <span>编辑文章</span>
          </div>
        }
        open={isEditModalOpen}
        onCancel={handleCloseEdit}
        footer={[
          <LiquidButton key='cancel' variant='secondary' onClick={handleCloseEdit} className='!h-10 !px-6'>
            取消
          </LiquidButton>,
          <LiquidButton
            key='save'
            variant='primary'
            loading={updateLoading}
            onClick={handleSaveEdit}
            className='!h-10 !px-8'
          >
            保存
          </LiquidButton>
        ]}
        width={800}
        destroyOnClose
      >
        <Spin spinning={loadingDetail} tip='正在加载文章详情...'>
          <Form
            form={form}
            layout='vertical'
            preserve={false}
          >
            <Form.Item
              name='title'
              label='标题'
              rules={[{ required: true, message: '请输入文章标题' }]}
            >
              <Input placeholder='请输入文章标题' />
            </Form.Item>

            <Form.Item
              name='excerpt'
              label='摘要'
            >
              <TextArea
                rows={2}
                placeholder='请输入文章摘要'
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item
              name='content'
              label='内容'
              rules={[{ required: true, message: '请输入文章内容' }]}
            >
              <TextArea
                rows={10}
                placeholder='请输入文章内容（支持Markdown）'
              />
            </Form.Item>

            <div className='grid grid-cols-2 gap-4'>
              <Form.Item
                name='status'
                label='状态'
                rules={[{ required: true, message: '请选择文章状态' }]}
              >
                <Select placeholder='请选择状态'>
                  <Option value='DRAFT'>草稿</Option>
                  <Option value='PUBLISHED'>已发布</Option>
                  <Option value='ARCHIVED'>已归档</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name='accessLevel'
                label='访问级别'
                rules={[{ required: true, message: '请选择访问级别' }]}
              >
                <Select placeholder='请选择访问级别'>
                  <Option value='PUBLIC'>公开</Option>
                  <Option value='PRIVATE'>私有</Option>
                  <Option value='RESTRICTED'>受限</Option>
                </Select>
              </Form.Item>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <Form.Item
                name='tags'
                label='标签'
              >
                <Select
                  mode='tags'
                  placeholder='请输入标签'
                  tokenSeparators={[',']}
                />
              </Form.Item>

              <Form.Item
                name='categories'
                label='分类'
              >
                <Select
                  mode='tags'
                  placeholder='请输入分类'
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </div>

            <Form.Item
              name='coverImageUrl'
              label='封面图片URL'
            >
              <Input placeholder='请输入封面图片URL' />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  )
}

export default PostManagement
