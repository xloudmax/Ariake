import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Input,
  Alert,
  Form,
  Typography,
  Divider,
  Steps
} from 'antd'
import { LiquidButton } from '../components/LiquidButton'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks'
import { AuthLayout } from '../layouts/AuthLayout'

const { Text } = Typography

export default function ForgotPasswordPage () {
  // GraphQL hooks
  const { requestPasswordReset, confirmPasswordReset, loading } = useAuth()
  const navigate = useNavigate()

  // 页面状态
  const [currentStep, setCurrentStep] = useState<'request' | 'reset'>('request')

  // 表单状态
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const commonInputStyle = {
    background: 'var(--surface-elevated-glass)',
    border: '1px solid var(--surface-border)',
    color: 'var(--surface-text)',
    backdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
  }
  const authPrefixClass = 'text-[color:var(--surface-text-muted)]'
  const authMetaTextClass = 'text-[color:var(--surface-text-muted)]'

  // 请求密码重置
  const handleRequestReset = async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    // 简单的邮箱格式验证
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址')
      return
    }

    setError(null)
    setSuccessMessage(null)
    try {
      await requestPasswordReset(email)
      setSuccessMessage('密码重置邮件已发送到您的邮箱，请检查收件箱')
      setCurrentStep('reset')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '发送密码重置邮件失败，请重试'
      setError(errorMessage)
    }
  }

  // 确认密码重置
  const handleConfirmReset = async () => {
    if (!token.trim()) {
      setError('请输入重置令牌')
      return
    }

    if (!newPassword) {
      setError('请输入新密码')
      return
    }

    if (newPassword.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setError(null)
    setSuccessMessage(null)
    try {
      await confirmPasswordReset(token, newPassword)
      setSuccessMessage('密码重置成功，请使用新密码登录')
      // 3秒后跳转到登录页面
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '密码重置失败，请重试'
      setError(errorMessage)
    }
  }

  return (
    <AuthLayout
      title={currentStep === 'request' ? '忘记密码' : '重置密码'}
      subtitle='找回账户访问权限'
    >
      <Steps
        current={currentStep === 'request' ? 0 : 1}
        className='auth-flow-steps mb-8'
        size='small'
        items={[
          {
            title: '请求重置',
          },
          {
            title: '重置密码',
          }
        ]}
      />

      {error && (
        <Alert
          message={error}
          type='error'
          showIcon
          className='auth-feedback-alert auth-feedback-alert-error mb-6 rounded-lg'
        />
      )}

      {successMessage && (
        <Alert
          message={successMessage}
          type='success'
          showIcon
          className='auth-feedback-alert auth-feedback-alert-success mb-6 rounded-lg'
        />
      )}

      {currentStep === 'request' ? (
          // 请求重置表单
          <Form onFinish={handleRequestReset} layout='vertical' size='large'>
            <Form.Item
              label='邮箱地址'
              required
              className='mb-4'
            >
              <Input
                prefix={<MailOutlined className={authPrefixClass} />}
                type='email'
                placeholder='请输入注册时使用的邮箱地址'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item>
              <LiquidButton
                htmlType='submit'
                loading={loading.resetRequest}
                className='w-full h-12 text-lg font-semibold'
              >
                {loading.resetRequest ? '发送中...' : '发送重置邮件'}
              </LiquidButton>
            </Form.Item>
          </Form>
        ) : (
          // 重置密码表单
          <Form onFinish={handleConfirmReset} layout='vertical' size='large'>
            <Form.Item
              label='重置令牌'
              required
              className='mb-4'
            >
              <Input
                prefix={<LockOutlined className={authPrefixClass} />}
                placeholder='请输入邮件中的重置令牌'
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item
              label='新密码'
              required
              className='mb-4'
            >
              <Input.Password
                prefix={<LockOutlined className={authPrefixClass} />}
                placeholder='请输入新密码（至少6个字符）'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item
              label='确认新密码'
              required
              className='mb-6'
            >
              <Input.Password
                prefix={<LockOutlined className={authPrefixClass} />}
                placeholder='请再次输入新密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className='rounded-xl'
                style={commonInputStyle}
              />
            </Form.Item>

            <Form.Item>
              <LiquidButton
                htmlType='submit'
                loading={loading.resetConfirm}
                className='w-full h-12 text-lg font-semibold'
              >
                {loading.resetConfirm ? '重置中...' : '重置密码'}
              </LiquidButton>
            </Form.Item>
          </Form>
        )}

      <Divider style={{ borderColor: 'var(--surface-border)' }}>
        <span className={authMetaTextClass}>或</span>
      </Divider>
      <div className='text-center'>
        <Text className={authMetaTextClass}>想起密码了？</Text>
        <Link to='/login' className='ml-2 font-semibold text-[color:var(--color-primary)] hover:opacity-80 transition-opacity'>
          返回登录
        </Link>
      </div>
    </AuthLayout>
  )
}
