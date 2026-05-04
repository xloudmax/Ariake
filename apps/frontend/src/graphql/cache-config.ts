// src/graphql/cache-config.ts
// GraphQL缓存优化配置

import { TypePolicies } from '@apollo/client'

// 缓存类型策略配置
export const typePolicies: TypePolicies = {
  Query: {
    fields: {
      // 博客文章分页缓存
      // posts: {
      //   keyArgs: ['filter', 'sort'], // 基于筛选和排序参数创建缓存键
      // },

      // 用户列表分页缓存
      // users: {
      //   keyArgs: ['search', 'role', 'isVerified'], // 基于搜索和筛选参数
      // },

      // 邀请码列表分页缓存
      // inviteCodes: {
      //   keyArgs: ['isActive'], // 基于状态筛选
      // },

      // 文件列表缓存
      files: {
        keyArgs: ['folder'], // 基于文件夹参数
      },

      // 搜索结果不缓存（每次都是新的查询）
      searchPosts: {
        keyArgs: ['query'], // 基于搜索关键词
      },
    },
  },

  BlogPost: {
    fields: {
      // 文章统计数据可以合并更新
      stats: {
        merge: true,
      },
      // 版本历史列表
      versions: {
        merge: false, // 不合并，总是使用最新数据
      },
    },
  },

  BlogPostStats: {
    keyFields: ['id'], // 使用id作为唯一标识符
  },

  BlogPostVersion: {
    keyFields: ['id'], // 使用id作为唯一标识符
  },

  User: {
    keyFields: ['id'], // 使用id作为唯一标识符
    fields: {
      // 用户的文章列表
      posts: {
        keyArgs: ['limit'],
      },
    },
  },

  MarkdownFile: {
    keyFields: ['name', 'folder'], // 使用文件名和文件夹作为唯一标识
  },

  FileFolder: {
    keyFields: ['name'], // 使用文件夹名作为唯一标识
  },
}

// 缓存配置选项
export const cacheConfig = {
  typePolicies,

  // 缓存大小限制（可选）
  possibleTypes: {}, // 如果使用联合类型或接口，在这里定义

  // 移除 addTypename 配置，因为 Apollo Client 会自动添加 __typename
}
