import { gql, useMutation, useQuery } from '@apollo/client'
import type {
  UpdateProfileInput,
  VerificationType,
  User,
} from '@/generated/graphql'
import { showErrorNotification } from '@/components/ErrorNotification'

// ==================== MUTATIONS ====================

// 用户注册
export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      refreshToken
      expiresAt
      user {
        id
        username
        email
        role
        isVerified
        isActive
        avatar
        bio
        createdAt
      }
    }
  }
`

// 用户登录
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      refreshToken
      expiresAt
      user {
        id
        username
        email
        role
        isVerified
        isActive
        avatar
        bio
        lastLoginAt
      }
    }
  }
`

// 邮箱登录（发送验证码）
export const EMAIL_LOGIN_MUTATION = gql`
  mutation EmailLogin($input: EmailLoginInput!) {
    emailLogin(input: $input) {
      success
      message
      code
    }
  }
`

// 验证邮箱并登录
export const VERIFY_EMAIL_AND_LOGIN_MUTATION = gql`
  mutation VerifyEmailAndLogin($input: VerifyEmailInput!) {
    verifyEmailAndLogin(input: $input) {
      token
      refreshToken
      expiresAt
      user {
        id
        username
        email
        role
        isVerified
        isActive
      }
    }
  }
`

// 用户登出
export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`

// 刷新Token
export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      token
      refreshToken
      expiresAt
      user {
        id
        username
        email
        role
        isVerified
        isActive
        avatar
        bio
      }
    }
  }
`

// 发送验证码
export const SEND_VERIFICATION_CODE_MUTATION = gql`
  mutation SendVerificationCode($email: String!, $type: VerificationType!) {
    sendVerificationCode(email: $email, type: $type) {
      success
      message
      code
    }
  }
`

// 验证邮箱
export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      success
      message
      code
    }
  }
`

// 请求密码重置
export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      success
      message
      code
    }
  }
`

// 确认密码重置
export const CONFIRM_PASSWORD_RESET_MUTATION = gql`
  mutation ConfirmPasswordReset($input: ConfirmPasswordResetInput!) {
    confirmPasswordReset(input: $input) {
      success
      message
      code
    }
  }
`

// 更新个人资料
export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      username
      email
      bio
      avatar
      updatedAt
    }
  }
`

// 修改密码
export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
      code
    }
  }
`

// ==================== QUERIES ====================

// 获取当前用户
export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
      isVerified
      isActive
      avatar
      bio
      lastLoginAt
      emailVerifiedAt
      createdAt
      updatedAt
      posts(limit: 5) {
        id
        title
        slug
        status
        publishedAt
      }
      postsCount
    }
  }
`

// 获取指定用户
// ==================== CUSTOM HOOKS ====================

// 认证状态管理 Hook
export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  // 登录 Hook
  const [loginMutation, { loading: loginLoading, error: loginError }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data.login.token) {
        localStorage.setItem('token', data.login.token)
        localStorage.setItem('refreshToken', data.login.refreshToken)
        // 可以触发全局状态更新或重定向
      }
    },
    onError: (error) => {
      showErrorNotification('登录错误', (error as Error).message)
    }
  })

  // 注册 Hook
  const [registerMutation, { loading: registerLoading, error: registerError }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      if (data.register.token) {
        localStorage.setItem('token', data.register.token)
        localStorage.setItem('refreshToken', data.register.refreshToken)
      }
    }
  })

  // 邮箱登录 Hook
  const [emailLoginMutation, { loading: emailLoginLoading, error: emailLoginError }] = useMutation(EMAIL_LOGIN_MUTATION)

  // 验证邮箱并登录 Hook
  const [verifyEmailAndLoginMutation, { loading: verifyLoading, error: verifyError }] = useMutation(VERIFY_EMAIL_AND_LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data.verifyEmailAndLogin.token) {
        localStorage.setItem('token', data.verifyEmailAndLogin.token)
        localStorage.setItem('refreshToken', data.verifyEmailAndLogin.refreshToken)
      }
    }
  })

  // 登出 Hook
  const [logoutMutation] = useMutation(LOGOUT_MUTATION, {
    onCompleted: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  })

  // 刷新Token Hook
  const [refreshTokenMutation, { loading: refreshLoading, error: refreshError }] = useMutation(REFRESH_TOKEN_MUTATION, {
    onCompleted: (data) => {
      if (data.refreshToken.token) {
        localStorage.setItem('token', data.refreshToken.token)
        localStorage.setItem('refreshToken', data.refreshToken.refreshToken)
      }
    },
    onError: (_error) => {
      // Token 刷新失败，清除本地存储并重定向到登录页
      // console.error('Token refresh failed:', error);
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  })

  // 发送验证码 Hook
  const [sendVerificationCodeMutation, { loading: sendCodeLoading }] = useMutation(SEND_VERIFICATION_CODE_MUTATION)

  // 验证邮箱 Hook
  const [verifyEmailMutation, { loading: verifyEmailLoading }] = useMutation(VERIFY_EMAIL_MUTATION)

  // 密码重置 Hooks
  const [requestPasswordResetMutation, { loading: resetRequestLoading }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION)
  const [confirmPasswordResetMutation, { loading: resetConfirmLoading }] = useMutation(CONFIRM_PASSWORD_RESET_MUTATION)

  // 个人资料更新 Hook
  const [updateProfileMutation, { loading: updateProfileLoading }] = useMutation(UPDATE_PROFILE_MUTATION)

  // 密码修改 Hook
  const [changePasswordMutation, { loading: changePasswordLoading }] = useMutation(CHANGE_PASSWORD_MUTATION)

  // API 函数
  const login = async (identifier: string, password: string, remember: boolean = false) => {
    const result = await loginMutation({
      variables: {
        input: {
          identifier,
          password,
          remember
        }
      }
    })
    return result.data?.login
  }

  const register = async (username: string, email: string, password: string, inviteCode?: string) => {
    const result = await registerMutation({
      variables: {
        input: {
          username,
          email,
          password,
          inviteCode
        }
      }
    })
    return result.data?.register
  }

  const emailLogin = async (email: string) => {
    const result = await emailLoginMutation({
      variables: {
        input: { email }
      }
    })
    return result.data?.emailLogin
  }

  const verifyEmailAndLogin = async (email: string, code: string, type: VerificationType) => {
    const result = await verifyEmailAndLoginMutation({
      variables: {
        input: {
          email,
          code,
          type
        }
      }
    })
    return result.data?.verifyEmailAndLogin
  }

  const logout = async () => {
    try {
      await logoutMutation()
    } catch (error) {
      showErrorNotification('登出错误', (error as Error).message)
      // 即使出错也清理本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  }

  const refreshToken = async () => {
    try {
      const result = await refreshTokenMutation()
      return result.data?.refreshToken
    } catch (error) {
      showErrorNotification('Token刷新失败', (error as Error).message)
      throw error
    }
  }

  const sendVerificationCode = async (email: string, type: VerificationType) => {
    const result = await sendVerificationCodeMutation({
      variables: { email, type }
    })
    return result.data?.sendVerificationCode
  }

  const verifyEmail = async (email: string, code: string, type: VerificationType) => {
    const result = await verifyEmailMutation({
      variables: {
        input: { email, code, type }
      }
    })
    return result.data?.verifyEmail
  }

  const requestPasswordReset = async (email: string) => {
    const result = await requestPasswordResetMutation({
      variables: {
        input: { email }
      }
    })
    return result.data?.requestPasswordReset
  }

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    const result = await confirmPasswordResetMutation({
      variables: {
        input: { token, newPassword }
      }
    })
    return result.data?.confirmPasswordReset
  }

  const updateProfile = async (profileData: UpdateProfileInput) => {
    const result = await updateProfileMutation({
      variables: {
        input: profileData
      }
    })
    return result.data?.updateProfile
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const result = await changePasswordMutation({
      variables: { currentPassword, newPassword }
    })
    return result.data?.changePassword
  }

  return {
    // API 函数
    login,
    register,
    emailLogin,
    verifyEmailAndLogin,
    logout,
    refreshToken,
    sendVerificationCode,
    verifyEmail,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    changePassword,

    // 加载状态
    loading: {
      login: loginLoading,
      register: registerLoading,
      emailLogin: emailLoginLoading,
      verify: verifyLoading,
      refresh: refreshLoading,
      sendCode: sendCodeLoading,
      verifyEmail: verifyEmailLoading,
      resetRequest: resetRequestLoading,
      resetConfirm: resetConfirmLoading,
      updateProfile: updateProfileLoading,
      changePassword: changePasswordLoading,
    },

    // 错误状态
    errors: {
      login: loginError,
      register: registerError,
      emailLogin: emailLoginError,
      verify: verifyError,
      refresh: refreshError,
    }
  }
}

// 当前用户 Hook
export const useCurrentUser = (token?: string | null) => {
  // 预先尝试从显式传入或本地获取以确定初始状态
  const effectiveToken = token !== undefined ? token : localStorage.getItem('token')

  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    skip: !effectiveToken,
    errorPolicy: 'all',
    // 强制依赖 token 的变化
    context: {
      headers: {
        authorization: effectiveToken ? `Bearer ${effectiveToken}` : '',
      }
    }
  })

  return {
    user: data?.me || null,
    loading,
    error,
    refetch
  }
}
