import { describe, it, expect } from 'vitest'
import { InMemoryCache, gql } from '@apollo/client'
import client from '../graphql/client'

describe('GraphQL Client Tests', () => {
  it('should create Apollo Client instances', () => {
    expect(client).toBeDefined()
    expect(client.cache).toBeInstanceOf(InMemoryCache)
  })

  it('should have proper client configuration', () => {
    // 测试客户端是否正确配置
    expect(client.link).toBeDefined()
    expect(client.cache).toBeDefined()
  })
})

// 测试GraphQL查询格式
describe('GraphQL Operations', () => {
  it('should parse valid GraphQL queries', () => {
    const testQuery = gql`
      query TestQuery {
        __typename
      }
    `

    expect(testQuery).toBeDefined()
    expect(testQuery.definitions).toHaveLength(1)
  })
})
