// 用户相关类型定义
import type {
  User as GeneratedUser,
  UserRole as GeneratedUserRole,
  AuthPayload as GeneratedAuthPayload
} from '@/generated/graphql'

// 用户角色类型
export type UserRole = GeneratedUserRole

// User type
export type User = GeneratedUser

// Auth payload type
export type AuthPayload = GeneratedAuthPayload

// 登录输入类型
export interface LoginInput {
  identifier: string;
  password: string;
  remember?: boolean;
}

// 注册输入类型
export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  inviteCode?: string;
}

// 邮箱登录输入类型
export interface EmailLoginInput {
  email: string;
}

// 验证邮箱输入类型
export interface VerifyEmailInput {
  email: string;
  code: string;
  type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';
}

// 请求密码重置输入类型
export interface RequestPasswordResetInput {
  email: string;
}

// 确认密码重置输入类型
export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
}

// 更新个人资料输入类型
export interface UpdateProfileInput {
  username?: string;
  avatar?: string;
  bio?: string;
}

// 管理员创建用户输入类型
export interface AdminCreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  isVerified?: boolean;
}
