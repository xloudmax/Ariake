// GraphQL API 统一入口
// 导出所有API模块的hooks和函数

// 认证相关
export * from './auth'
export type { AuthState } from './auth'

// 博客相关
export * from './blog'

// 删除文件管理相关导出

// 管理员相关
export * from './admin'

// Apollo Client配置
export { default as apolloClient } from '../../graphql/client'

// 重新导出类型（如果需要的话）
export type {
  User,
  BlogPost,
  BlogPostVersion,
  // 删除 FileFolder 和 MarkdownFile 类型
  InviteCode,
  ServerDashboard,
  AuthPayload,
  GeneralResponse,
  // 输入类型
  LoginInput,
  RegisterInput,
  CreatePostInput,
  UpdatePostInput,
  // 删除 CreateFolderInput
  AdminCreateUserInput,
  // 枚举
  UserRole,
  PostStatus,
  AccessLevel,
  VerificationType,
} from '../../generated/graphql'
