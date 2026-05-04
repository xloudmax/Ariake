// 统一错误处理服务
import type { NotificationInstance } from 'antd/es/notification/interface'
import type { GraphQLError } from 'graphql'

// 错误类型定义
export interface AppError {
  message: string;
  code?: string;
  type: 'network' | 'graphql' | 'validation' | 'auth' | 'server' | 'unknown';
  originalError?: unknown;
}

// 错误处理配置
interface ErrorHandlerConfig {
  showNotifications: boolean;
  showConsoleErrors: boolean;
  defaultErrorMessage: string;
  notificationApi?: NotificationInstance;
}

// 默认配置
const defaultConfig: ErrorHandlerConfig = {
  showNotifications: true,
  showConsoleErrors: true,
  defaultErrorMessage: '操作失败，请稍后重试',
}

// 静默错误关键字列表（这些错误不会显示通知）
const silentErrorPatterns = [
  '已经点赞',
  '尚未点赞',
  'already liked',
  'not liked',
  '已收藏',
  '未收藏',
]

// 检查错误是否应该静默处理
const shouldSilenceError = (message: string): boolean => {
  const lowerMessage = message.toLowerCase()
  return silentErrorPatterns.some(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  )
}

// 全局错误处理配置
let config: ErrorHandlerConfig = { ...defaultConfig }

// 设置错误处理配置
export const setErrorHandlerConfig = (newConfig: Partial<ErrorHandlerConfig>) => {
  config = { ...config, ...newConfig }
}

// 解析GraphQL错误
const parseGraphQLErrors = (errors: readonly GraphQLError[]): AppError[] => {
  return errors.map(error => {
    const extensions = error.extensions || {}
    let type: AppError['type'] = 'graphql'
    const code = extensions.code as string || 'UNKNOWN_ERROR'

    // 根据错误代码确定错误类型
    switch (code) {
      case 'UNAUTHENTICATED':
      case 'FORBIDDEN':
        type = 'auth'
        break
      case 'BAD_USER_INPUT':
      case 'VALIDATION_ERROR':
        type = 'validation'
        break
      case 'INTERNAL_SERVER_ERROR':
        type = 'server'
        break
      default:
        type = 'graphql'
    }

    return {
      message: error.message,
      code,
      type,
      originalError: error,
    }
  })
}

// 解析网络错误
const parseNetworkError = (error: unknown): AppError => {
  let message = config.defaultErrorMessage
  let code = 'NETWORK_ERROR'
  let type: AppError['type'] = 'network'

  const networkError = error as { statusCode?: number; message?: string }
  if (networkError?.statusCode === 401) {
    message = '认证已过期，请重新登录'
    code = 'UNAUTHENTICATED'
    type = 'auth'
  } else if (networkError?.statusCode === 403) {
    message = '权限不足'
    code = 'FORBIDDEN'
    type = 'auth'
  } else if (networkError?.statusCode && networkError.statusCode >= 500) {
    message = '服务器内部错误'
    code = 'INTERNAL_SERVER_ERROR'
    type = 'server'
  } else if (networkError?.message) {
    message = networkError.message
  }

  return {
    message,
    code,
    type,
    originalError: error,
  }
}

// 显示错误通知
const showNotification = (error: AppError) => {
  if (!config.showNotifications) return

  // 检查是否应该静默处理
  if (shouldSilenceError(error.message)) {
    return
  }

  // 使用来自 App 上下文的 notification 实例，避免静态调用带来的主题警告
  if (!config.notificationApi) {
    if (config.showConsoleErrors && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[App Warning] notificationApi is not set in errorHandler config')
    }
    return
  }

  switch (error.type) {
    case 'auth':
      // 认证错误特殊处理，自动跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      break
    case 'validation':
      config.notificationApi.warning({
        message: '提示',
        description: error.message,
        duration: 3,
      })
      break
    case 'server':
      config.notificationApi.error({
        message: '服务器错误',
        description: error.message,
        duration: 4,
      })
      break
    default:
      config.notificationApi.error({
        message: '操作失败',
        description: error.message,
        duration: 3,
      })
  }
}

// 记录错误到控制台
const logError = (error: AppError) => {
  if (!config.showConsoleErrors) return

  const errorInfo = {
    message: error.message,
    code: error.code,
    type: error.type,
    timestamp: new Date().toISOString(),
    originalError: error.originalError,
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error('[App Error]', errorInfo)
  }
}

// 处理GraphQL错误
export const handleGraphQLErrors = (errors: readonly GraphQLError[]): AppError[] => {
  const appErrors = parseGraphQLErrors(errors)

  appErrors.forEach(error => {
    logError(error)
    showNotification(error)
  })

  return appErrors
}

// 处理网络错误
export const handleNetworkError = (error: unknown): AppError => {
  const appError = parseNetworkError(error)

  logError(appError)
  showNotification(appError)

  return appError
}

// 处理一般错误
export const handleError = (error: unknown): AppError => {
  let appError: AppError

  // 如果是GraphQL错误数组
  if (Array.isArray(error) && error.length > 0 && error[0].message) {
    const errors = handleGraphQLErrors(error)
    appError = errors[0] // 返回第一个错误
  }
  // 如果是网络错误
  else if ((error as { networkError?: unknown })?.networkError) {
    appError = handleNetworkError((error as { networkError: unknown }).networkError)
  }
  // 如果是GraphQL错误对象
  else if ((error as { graphQLErrors?: GraphQLError[] })?.graphQLErrors) {
    const errors = handleGraphQLErrors((error as { graphQLErrors: GraphQLError[] }).graphQLErrors)
    appError = errors[0] // 返回第一个错误
  }
  // 其他错误
  else {
    appError = {
      message: (error as { message?: string })?.message || config.defaultErrorMessage,
      type: 'unknown',
      originalError: error,
    }

    logError(appError)
    showNotification(appError)
  }

  return appError
}

// 创建自定义错误
export const createAppError = (
  message: string,
  type: AppError['type'] = 'unknown',
  code?: string,
  originalError?: unknown
): AppError => {
  return {
    message,
    type,
    code,
    originalError,
  }
}

// 静默处理错误（不显示通知）
export const handleSilentError = (error: unknown): AppError => {
  const originalShowNotifications = config.showNotifications
  config.showNotifications = false

  const appError = handleError(error)

  config.showNotifications = originalShowNotifications

  return appError
}

export default {
  handleGraphQLErrors,
  handleNetworkError,
  handleError,
  createAppError,
  handleSilentError,
  setErrorHandlerConfig,
}
