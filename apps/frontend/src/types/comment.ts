// 评论相关类型定义
import type {
  BlogPostComment as GeneratedBlogPostComment,
  CreateCommentInput as GeneratedCreateCommentInput,
  UpdateCommentInput as GeneratedUpdateCommentInput,
  CreateCommentMutationData
} from '@/generated/graphql'
import type { ApolloError } from '@apollo/client'

// Comment type
export type BlogPostComment = GeneratedBlogPostComment

// Partial comment type for mutation responses (missing blogPost and replies)
export type PartialBlogPostComment = CreateCommentMutationData['createComment']

// Query response types that match the actual GraphQL structure
export type CommentQueryResponse = {
  comment?: BlogPostComment | null;
}

export type CommentsQueryResponse = {
  comments: {
    comments: BlogPostComment[];
    total: number;
  };
}

// Create comment input type
export type CreateCommentInput = GeneratedCreateCommentInput

// Update comment input type
export type UpdateCommentInput = GeneratedUpdateCommentInput

// 评论过滤器
export interface CommentFilter {
  blogPostId?: string;
  userId?: string;
  isApproved?: boolean;
}

// 评论排序
export interface CommentSort {
  field?: string;
  order?: 'ASC' | 'DESC';
}

// 评论结果
export interface CommentResult {
  comments: BlogPostComment[];
  total: number;
}

// 评论钩子返回类型
export interface UseCommentsReturn {
  comments: BlogPostComment[];
  total: number;
  loading: boolean;
  error?: ApolloError;
  loadMore: () => void;
  refetch: () => void;
}

export interface UseCommentReturn {
  comment: BlogPostComment | null;
  loading: boolean;
  error?: ApolloError;
}

export interface UseCommentActionsReturn {
  createComment: (input: CreateCommentInput) => Promise<PartialBlogPostComment>;
  updateComment: (id: string, input: UpdateCommentInput) => Promise<PartialBlogPostComment>;
  deleteComment: (id: string) => Promise<void>;
  likeComment: (id: string) => Promise<PartialBlogPostComment>;
  unlikeComment: (id: string) => Promise<PartialBlogPostComment>;
  reportComment: (id: string) => Promise<PartialBlogPostComment>;

  loading: {
    create: boolean;
    update: boolean;
    delete: boolean;
    like: boolean;
    unlike: boolean;
    report: boolean;
  };

  errors: {
    create?: ApolloError;
    update?: ApolloError;
    delete?: ApolloError;
    like?: ApolloError;
    unlike?: ApolloError;
    report?: ApolloError;
  };
}
