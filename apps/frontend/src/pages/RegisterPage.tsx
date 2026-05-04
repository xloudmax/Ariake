import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Input,
  Alert,
  Steps,
  Form,
  Typography,
  Divider,
} from 'antd'
import { LiquidButton } from '../components/LiquidButton'
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useAuth, useAppUser } from '../hooks'
import { AuthLayout } from '../layouts/AuthLayout'

const { Text } = Typography

export default function RegisterPage () {
  // GraphQL hooks
  const { register, sendVerificationCode, verifyEmail, loading } = useAuth()
  const { isAuthenticated } = useAppUser()
  const navigate = useNavigate()

  const commonInputStyle = {
    background: 'var(--surface-elevated-glass)',
    border: '1px solid var(--surface-border)',
    color: 'var(--surface-text)',
    backdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
  }
  const authPrefixClass = 'text-[color:var(--surface-text-muted)]'
  const authMetaTextClass = 'text-[color:var(--surface-text-muted)]'
  const authGhostActionClass = 'text-[color:var(--surface-text-muted)] hover:text-[color:var(--surface-text)]'
  const authAccentActionClass = 'text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] hover:opacity-80'

  // 页面状态
  const [currentStep, setCurrentStep] = useState<'register' | 'verify'>(
    'register'
  )

  // 注册表单状态
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  })

  // 验证状态
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 如果已登录，重定向到博客主页
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // 表单验证
  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData

    if (!username.trim()) {
      setError('用户名不能为空')
      return false
    }

    if (username.length < 3) {
      setError('用户名至少3个字符')
      return false
    }

    if (!email.trim()) {
      setError('邮箱不能为空')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return false
    }

    if (!password.trim()) {
      setError('密码不能为空')
      return false
    }

    if (password.length < 6) {
      setError('密码至少6个字符')
      return false
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return false
    }

    return true
  }

  // 处理注册
  const handleRegister = async () => {
    if (!validateForm()) {
      return
    }

    setError(null)
    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.inviteCode || undefined
      )

      await sendVerificationCode(formData.email, 'REGISTER')
      setCurrentStep('verify')
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '注册失败，请重试')
    }
  }

  // 处理邮箱验证
  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setError('请输入验证码')
      return
    }

    setError(null)
    try {
      await verifyEmail(formData.email, verificationCode, 'REGISTER')
      // 验证成功，直接跳转到博客主页
      navigate('/', {
        state: {
          message: '注册成功，欢迎来到博客！',
          email: formData.email,
        },
      })
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '验证码错误或已过期')
    }
  }

  // 重新发送验证码
  const handleResendCode = async () => {
    setError(null)
    try {
      await sendVerificationCode(formData.email, 'REGISTER')
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '发送验证码失败')
    }
  }

  // 处理表单输入
  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }))
      // 清除错误
      if (error) setError(null)
    }

  return (
    <AuthLayout
      title={currentStep === 'register' ? '加入我们' : '验证邮箱'}
      subtitle={currentStep === 'register' ? '开启您的创作之旅' : '安全验证'}
    >
      {/* 步骤指示器 */}
      <Steps
        current={currentStep === 'register' ? 0 : 1}
        className='auth-flow-steps mb-8'
        size='small'
        items={[
          { title: '填写信息' },
          { title: '验证邮箱' },
          { title: '完成' },
        ]}
      />

      {error && (
        <Alert
          message={error}
          type='error'
          showIcon
          className='auth-feedback-alert auth-feedback-alert-error mb-6 rounded-lg'
          closable
          onClose={() => setError(null)}
        />
      )}

      {currentStep === 'register'
        ? (
          <Form onFinish={handleRegister} layout='vertical' size='large'>
            <Form.Item name='username' rules={[{ required: true, message: '' }]} className='mb-4'>
              <Input
                prefix={<UserOutlined className={authPrefixClass} />}
                placeholder='用户名'
                value={formData.username}
                onChange={handleInputChange('username')}
                className='rounded-xl bg-transparent'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item name='email' rules={[{ required: true, message: '' }]} className='mb-4'>
              <Input
                prefix={<MailOutlined className={authPrefixClass} />}
                type='email'
                placeholder='电子邮箱'
                value={formData.email}
                onChange={handleInputChange('email')}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item name='password' rules={[{ required: true, message: '' }]} className='mb-4'>
              <Input.Password
                prefix={<LockOutlined className={authPrefixClass} />}
                placeholder='设置密码'
                value={formData.password}
                onChange={handleInputChange('password')}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item name='confirmPassword' rules={[{ required: true, message: '' }]} className='mb-4'>
              <Input.Password
                prefix={<LockOutlined className={authPrefixClass} />}
                placeholder='确认密码'
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item name='inviteCode' className='mb-6'>
              <Input
                prefix={<SafetyOutlined className={authPrefixClass} />}
                placeholder='邀请码（可选）'
                value={formData.inviteCode}
                onChange={handleInputChange('inviteCode')}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item>
              <LiquidButton
                htmlType='submit'
                loading={loading.register}
                className='w-full h-12 text-lg font-semibold'
              >
                {loading.register ? '注册中...' : '立即注册'}
              </LiquidButton>
            </Form.Item>
          </Form>
          )
        : (
          <>
            <Alert
              message='验证码已发送'
              description={`请检查 ${formData.email} 的收件箱`}
              type='success'
              showIcon
              className='auth-feedback-alert auth-feedback-alert-success mb-8 rounded-2xl border border-[color:var(--color-success-soft)] bg-[color:var(--color-success-soft)]/20'
            />

            <Form onFinish={handleVerifyEmail} layout='vertical'>
              <Form.Item className='mb-8 text-center'>
                <Input
                  placeholder='000000'
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className='text-center text-3xl font-mono tracking-[0.5em] rounded-xl h-16'
                  style={commonInputStyle}
                />
              </Form.Item>

              <Form.Item>
                <LiquidButton
                  htmlType='submit'
                  loading={loading.verifyEmail}
                  className='w-full h-12 text-lg font-semibold'
                >
                  完成验证
                </LiquidButton>
              </Form.Item>
            </Form>

            <div className='flex justify-between mt-6 px-2'>
              <LiquidButton
                variant='ghost'
                onClick={() => {
                  setCurrentStep('register')
                  setVerificationCode('')
                  setError(null)
                }}
                className={authGhostActionClass}
              >
                返回修改
              </LiquidButton>
              <LiquidButton
                variant='ghost'
                loading={loading.sendCode}
                onClick={handleResendCode}
                className={authAccentActionClass}
              >
                重新发送
              </LiquidButton>
            </div>
          </>
          )}

      <Divider style={{ borderColor: 'var(--surface-border)' }}>
        <span className={authMetaTextClass}>或</span>
      </Divider>

      <div className='text-center'>
        <Text className={authMetaTextClass}>已有账号？</Text>
        <Link
          to='/login'
          className='ml-2 font-semibold text-[color:var(--color-primary)] transition-opacity hover:opacity-80'
        >
          直接登录
        </Link>
      </div>
    </AuthLayout>
  )
}
