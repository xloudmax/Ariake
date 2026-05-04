import React, { useState } from 'react'
import {
  Card,
  Form,
  Input,
  message,
  Divider,
  Typography,
  Row,
  Col,
  Spin
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import {
  SaveOutlined,
  EditOutlined
} from '@ant-design/icons'

import { useAppUser } from '@/hooks/useAppState'
import { useUpdateProfileMutation } from '@/generated/graphql'
import type { UpdateProfileInput } from '@/generated/graphql'
import AvatarUpload from '@/components/AvatarUpload'
import { PageHeader } from '../components/PageHeader'
import { PageContainer } from '../components/PageContainer'

const { Title } = Typography
const { TextArea } = Input

const profileStatusToneMap = {
  blue: 'text-blue-600 dark:text-blue-400',
  slate: 'text-slate-600 dark:text-slate-300',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
} as const

type ProfileStatusTone = keyof typeof profileStatusToneMap

const ProfilePage: React.FC = () => {
  const { user, refreshUser, isLoading } = useAppUser()
  const [form] = Form.useForm()
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar || undefined)

  const [updateProfileMutation, { loading: updateLoading }] = useUpdateProfileMutation()

  const handleAvatarChange = (url: string | undefined) => {
    setAvatarUrl(url)
  }

  const handleSubmit = async (values: { username: string; bio: string; email: string }) => {
    if (!user) {
      message.error('用户未登录')
      return
    }

    const input: UpdateProfileInput = {
      username: values.username,
      bio: values.bio,
      avatar: avatarUrl,
    }

    try {
      const { data } = await updateProfileMutation({
        variables: { input },
      })

      if (data?.updateProfile) {
        message.success('个人资料更新成功')
        refreshUser() // 刷新用户数据
      } else {
        message.error('更新失败，请重试')
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message || '更新个人资料时发生错误')
      } else {
        message.error('更新个人资料时发生错误')
      }
    }
  }

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <Spin size='large' tip='加载中...' />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='flex flex-col justify-center items-center min-h-screen gap-4'>
        <Title level={4}>请先登录以访问此页面</Title>
        <LiquidButton onClick={() => { window.location.href = '/login' }} variant='primary'>
          前往登录
        </LiquidButton>
      </div>
    )
  }

  return (
    <PageContainer className='animate-fade-in-up px-2 md:px-6'>
      <PageHeader
        title='个人资料'
        subtitle='管理您的个人信息和偏好设置'
        actions={<ThemeToggleButton useLiquid={false} showLabel />}
      />

      <Card className='profile-shell rounded-[24px] md:rounded-[32px] overflow-hidden border-[color:var(--surface-border)] shadow-xl bg-[color:var(--surface-elevated-glass)] backdrop-blur-md'>
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            username: user.username,
            email: user.email,
            bio: user.bio || '',
          }}
          onFinish={handleSubmit}
        >
          <Row gutter={[32, 32]}>
            {/* 左侧：基本信息 */}
            <Col xs={24} md={16}>
              <Title level={4} className='flex items-center gap-2 mb-6'>
                <EditOutlined className='text-[color:var(--color-primary)]' /> 基本信息
              </Title>

              <Form.Item
                label='用户名'
                name='username'
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 50, message: '用户名最多50个字符' },
                  {
                    pattern: /^[a-zA-Z0-9_-]+$/,
                    message: '用户名只能包含字母、数字、下划线和连字符'
                  }
                ]}
              >
                <Input
                  placeholder='请输入用户名'
                  maxLength={50}
                  className='!rounded-xl h-12'
                />
              </Form.Item>

              <Form.Item label='邮箱' name='email'>
                <Input
                  disabled
                  placeholder='邮箱地址'
                  className='!rounded-xl h-12 !bg-[color:var(--surface-elevated)]'
                  suffix={
                    user.isVerified
                      ? (
                        <span className='text-green-500 text-xs font-semibold px-2 py-0.5 bg-green-500/10 rounded-full'>已验证</span>
                        )
                      : (
                        <span className='text-orange-500 text-xs font-semibold px-2 py-0.5 bg-orange-500/10 rounded-full'>未验证</span>
                        )
                  }
                />
              </Form.Item>

              <Form.Item
                label='个人简介'
                name='bio'
                rules={[
                  { max: 500, message: '个人简介最多500个字符' }
                ]}
              >
                <TextArea
                  placeholder='介绍一下您自己...'
                  rows={4}
                  maxLength={500}
                  showCount
                  className='!rounded-xl'
                />
              </Form.Item>
            </Col>

            {/* 右侧：头像 */}
            <Col xs={24} md={8}>
              <div className='rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] p-6'>
                <Title level={4} className='mb-6'>头像设置</Title>
                <div className='flex justify-center py-4'>
                  <AvatarUpload
                    value={avatarUrl}
                    onChange={handleAvatarChange}
                    size={140}
                    showUploadButton
                  />
                </div>

                <Divider className='my-8 opacity-40' />
              </div>
            </Col>
          </Row>

          <Divider className='my-10 opacity-30' />

          {/* 账户统计/信息 */}
          <div className='mb-10'>
              <Title level={4} className='mb-6'>账户安全与状态</Title>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {([
                { label: '用户角色', value: user.role === 'ADMIN' ? '管理员' : '普通用户', tone: 'blue' },
                { label: '注册时间', value: new Date(user.createdAt).toLocaleDateString('zh-CN'), tone: 'slate' },
                { label: '账户状态', value: user.isActive ? '活跃' : '停用', tone: user.isActive ? 'emerald' : 'red' },
                { label: '最后登录', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录', tone: 'slate' }
              ] as Array<{ label: string; value: string; tone: ProfileStatusTone }>).map((item, idx) => (
                <div key={idx} className='flex items-center justify-between rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] p-4'>
                  <span className='text-sm font-medium text-[color:var(--surface-text-muted)]'>{item.label}</span>
                  <span className={`${profileStatusToneMap[item.tone]} font-semibold`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Divider className='my-10 opacity-30' />

          {/* 提交按钮 */}
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 py-4'>
            <LiquidButton
              htmlType='submit'
              loading={updateLoading}
              variant='primary'
              size='large'
              className='!h-14 !px-12 !rounded-2xl w-full sm:w-auto text-lg font-bold'
            >
              <div className='flex items-center justify-center gap-2'>
                <SaveOutlined />
                <span>保存个人资料</span>
              </div>
            </LiquidButton>
            <LiquidButton
              onClick={() => form.resetFields()}
              variant='secondary'
              size='large'
              className='!h-14 !px-10 !rounded-2xl w-full sm:w-auto text-lg'
            >
              取消并重置
            </LiquidButton>
          </div>
        </Form>
      </Card>
    </PageContainer>
  )
}

export default ProfilePage
