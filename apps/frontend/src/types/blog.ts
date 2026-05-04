// 博客相关类型定义
import type {
  BlogPost as GeneratedBlogPost,
  User as GeneratedUser,
  BlogPostStats as GeneratedBlogPostStats,
  BlogPostVersion as GeneratedBlogPostVersion,
  CreatePostInput as GeneratedCreatePostInput,
  UpdatePostInput as GeneratedUpdatePostInput
} from '@/generated/graphql'

// Extended blog post type
export type BlogPost = GeneratedBlogPost

// Extended user type
export type User = GeneratedUser

// 扩展的博客文章统计类型
export interface BlogPostStats extends GeneratedBlogPostStats {
  commentCount: number;
  // 可以在这里添加额外的类型定义或覆盖生成的类型
}

// Extended blog post version type
export type BlogPostVersion = GeneratedBlogPostVersion

// Input types
export type CreatePostInput = GeneratedCreatePostInput
export type UpdatePostInput = GeneratedUpdatePostInput

// 文章过滤条件
export interface PostFilter {
  authorId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  accessLevel?: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  tags?: string[];
  categories?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// 文章排序条件
export interface PostSort {
  field: 'createdAt' | 'updatedAt' | 'title' | 'likes';
  order: 'ASC' | 'DESC';
}

// 搜索结果类型
export interface SearchResults {
  posts: BlogPost[];
  total: number;
  took: string;
}

// 仪表盘统计类型
export interface DashboardStats {
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  engagementRate: number;
  avgEngagement: number;
}

// 热门标签类型
export interface TrendingTag {
  name: string;
  count: number;
}

// 搜索历史类型
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}
