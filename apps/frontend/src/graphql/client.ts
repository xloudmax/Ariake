import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client'
import { GraphQLError } from 'graphql'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { fromPromise } from '@apollo/client/link/utils'
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev'
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs'
import { cacheConfig } from './cache-config'
import errorHandler from '@/services/errorHandler'
import { tokenStorage } from '@/utils/tokenStorage'
import { getApiBaseUrl } from '@/utils/config'

// 加载Apollo Client错误信息（开发环境）
if (import.meta.env.DEV || process.env.NODE_ENV !== 'production') {
  loadDevMessages()
  loadErrorMessages()
}

// 内存中缓存 token 提高性能
let cachedToken: string | null = localStorage.getItem('token')

// 初始化从钥匙串抓取 token
tokenStorage.get().then(t => {
  if (t) cachedToken = t
})

// 获取 API 基础地址
const apiBaseUrl = getApiBaseUrl()

// 创建HTTP链接
const uploadLink = createUploadLink({
  // Ensure we don't end up with double slashes if the env var ends with one
  uri: `${apiBaseUrl.replace(/\/$/, '')}/graphql`,
})

// 认证链接 - 自动添加JWT token到请求头
const authLink = setContext(async (_, { headers }) => {
  // 每次请求前动态获取最新 token (如果缓存为空则尝试获取)
  if (!cachedToken) {
    cachedToken = await tokenStorage.get()
  }

  let token = cachedToken

  // 验证 token 是否有效
  if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
    token = null
  }

  // 基本的JWT格式验证
  if (token && token.split('.').length !== 3) {
    await tokenStorage.remove()
    cachedToken = null
    token = null
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  }
})

// 获取新Token的逻辑
let isRefreshing = false
let pendingRequests: (() => void)[] = []

const resolvePendingRequests = () => {
  pendingRequests.map(callback => callback())
  pendingRequests = []
}

const getNewToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const query = `
    mutation RefreshToken($refreshToken: String!) {
      refreshToken(refreshToken: $refreshToken) {
        token
        refreshToken
      }
    }
  `

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { refreshToken },
      }),
    })

    const { data, errors } = await response.json()

    if (errors || !data?.refreshToken) {
      throw new Error('Failed to refresh token')
    }

    const { token, refreshToken: newRefreshToken } = data.refreshToken

    // 更新钥匙串和内存缓存
    await tokenStorage.set(token)
    cachedToken = token
    localStorage.setItem('refreshToken', newRefreshToken)

    return token
  } catch (error) {
    await tokenStorage.remove()
    cachedToken = null
    localStorage.removeItem('refreshToken')
    throw error
  }
}

// 错误处理链接
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const isSilent = Boolean(operation.getContext().silentError)

  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const isUnauthenticated =
        err.extensions?.code === 'UNAUTHENTICATED' ||
        err.message.includes('未授权') ||
        err.message.includes('Unauthorized')

      if (isUnauthenticated) {
        if (!isRefreshing) {
          isRefreshing = true
          return fromPromise(
            getNewToken()
              .then(() => {
                isRefreshing = false
                resolvePendingRequests()
                return true
              })
              .catch(() => {
                isRefreshing = false
                pendingRequests = []
                return false
              })
          ).flatMap(success => {
            if (success) {
              const oldHeaders = operation.getContext().headers
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  authorization: `Bearer ${cachedToken}`,
                },
              })
              return forward(operation)
            } else {
              return new Observable(observer => {
                observer.error(err)
                observer.complete()
              })
            }
          })
        } else {
          return fromPromise(
            new Promise(resolve => {
              pendingRequests.push(() => resolve(true))
            })
          ).flatMap(() => {
            const oldHeaders = operation.getContext().headers
            operation.setContext({
              headers: {
                ...oldHeaders,
                authorization: `Bearer ${cachedToken}`,
              },
            })
            return forward(operation)
          })
        }
      }
    }

    if (isSilent) {
      errorHandler.handleSilentError(graphQLErrors)
    } else {
      const errors = graphQLErrors.map(error => ({
        ...error,
        nodes: [],
        source: undefined,
        positions: [],
        originalError: undefined,
        extensions: error.extensions || {}
      })) as unknown as readonly GraphQLError[]
      errorHandler.handleGraphQLErrors(errors)
    }
  }

  if (networkError) {
    if (isSilent) {
      errorHandler.handleSilentError(networkError)
    } else {
      errorHandler.handleNetworkError(networkError)
    }
  }
})

// 创建Apollo Client实例
const client = new ApolloClient({
  link: from([
    errorLink,
    authLink.concat(uploadLink),
  ]),
  cache: new InMemoryCache(cacheConfig),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
})

export default client
