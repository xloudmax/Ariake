import { DocumentNode } from 'graphql';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Time: { input: string; output: string; }
  Upload: { input: File; output: File; }
};

export type AccessLevel =
  | 'PRIVATE'
  | 'PUBLIC'
  | 'RESTRICTED';

export type AdminCreateUserInput = {
  email: Scalars['String']['input'];
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  password: Scalars['String']['input'];
  role?: InputMaybe<UserRole>;
  username: Scalars['String']['input'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  expiresAt: Scalars['Time']['output'];
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user: User;
};

export type BatchUpdateCategoriesInput = {
  categories: Array<Scalars['String']['input']>;
  operation: TagOperation;
  postIds: Array<Scalars['ID']['input']>;
};

export type BatchUpdateTagsInput = {
  operation: TagOperation;
  postIds: Array<Scalars['ID']['input']>;
  tags: Array<Scalars['String']['input']>;
};

export type BlogPost = {
  __typename?: 'BlogPost';
  accessLevel: AccessLevel;
  author: User;
  authorId: Scalars['ID']['output'];
  categories: Array<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Time']['output'];
  excerpt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isLiked: Scalars['Boolean']['output'];
  lastEditedAt?: Maybe<Scalars['Time']['output']>;
  notionPageId?: Maybe<Scalars['String']['output']>;
  publishedAt?: Maybe<Scalars['Time']['output']>;
  slug: Scalars['String']['output'];
  stats: BlogPostStats;
  status: PostStatus;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
  version: Scalars['Int']['output'];
  versions: Array<BlogPostVersion>;
};

export type BlogPostComment = {
  __typename?: 'BlogPostComment';
  blogPost: BlogPost;
  content: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  isApproved: Scalars['Boolean']['output'];
  likeCount: Scalars['Int']['output'];
  parent?: Maybe<BlogPostComment>;
  replies: Array<BlogPostComment>;
  reportCount: Scalars['Int']['output'];
  updatedAt: Scalars['Time']['output'];
  user: User;
};

export type BlogPostStats = {
  __typename?: 'BlogPostStats';
  commentCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lastViewedAt?: Maybe<Scalars['Time']['output']>;
  likeCount: Scalars['Int']['output'];
  shareCount: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['Time']['output']>;
  viewCount: Scalars['Int']['output'];
};

export type BlogPostVersion = {
  __typename?: 'BlogPostVersion';
  changeLog?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  createdBy: User;
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  versionNum: Scalars['Int']['output'];
};

export type CategoryInfo = {
  __typename?: 'CategoryInfo';
  count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  posts: Array<BlogPost>;
};

export type CommentFilterInput = {
  blogPostId?: InputMaybe<Scalars['ID']['input']>;
  isApproved?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type CommentResult = {
  __typename?: 'CommentResult';
  comments: Array<BlogPostComment>;
  total: Scalars['Int']['output'];
};

export type CommentSortInput = {
  field?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
};

export type ConfirmPasswordResetInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type CreateCommentInput = {
  blogPostId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateInviteCodeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt: Scalars['Time']['input'];
  maxUses?: InputMaybe<Scalars['Int']['input']>;
};

export type CreatePostInput = {
  accessLevel?: InputMaybe<AccessLevel>;
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  content: Scalars['String']['input'];
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  publishAt?: InputMaybe<Scalars['Time']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PostStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
};

export type EmailLoginInput = {
  email: Scalars['String']['input'];
};

export type EnhancedSearchResult = {
  __typename?: 'EnhancedSearchResult';
  facets: SearchFacets;
  posts: Array<BlogPost>;
  suggestions: Array<Scalars['String']['output']>;
  took: Scalars['String']['output'];
  total: Scalars['Int']['output'];
};

export type GeneralResponse = {
  __typename?: 'GeneralResponse';
  code?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GitHubConfig = {
  __typename?: 'GitHubConfig';
  repo: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type ImageUploadResponse = {
  __typename?: 'ImageUploadResponse';
  deleteUrl?: Maybe<Scalars['String']['output']>;
  filename: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
  size: Scalars['Int']['output'];
};

export type InviteCode = {
  __typename?: 'InviteCode';
  code: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  createdBy: User;
  currentUses: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  maxUses: Scalars['Int']['output'];
  usedAt?: Maybe<Scalars['Time']['output']>;
  usedBy?: Maybe<User>;
};

export type LoginInput = {
  identifier: Scalars['String']['input'];
  password: Scalars['String']['input'];
  remember?: InputMaybe<Scalars['Boolean']['input']>;
};

export type MechanismNode = {
  __typename?: 'MechanismNode';
  active_ingredient?: Maybe<Scalars['String']['output']>;
  children?: Maybe<Array<MechanismNode>>;
  id: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  adminCreateUser: User;
  adminDeleteUser: GeneralResponse;
  adminUpdateUser: User;
  approveComment: BlogPostComment;
  archivePost: BlogPost;
  batchUpdateCategories: GeneralResponse;
  batchUpdateTags: GeneralResponse;
  changePassword: GeneralResponse;
  clearAllNotifications: GeneralResponse;
  clearCache: GeneralResponse;
  confirmPasswordReset: GeneralResponse;
  createComment: BlogPostComment;
  createInviteCode: InviteCode;
  createPost: BlogPost;
  deactivateInviteCode: GeneralResponse;
  deleteComment: GeneralResponse;
  deleteNotification: GeneralResponse;
  deletePost: GeneralResponse;
  deleteUnusedCategories: GeneralResponse;
  deleteUnusedTags: GeneralResponse;
  deployToGitHubPages: GeneralResponse;
  emailLogin: GeneralResponse;
  likeComment: BlogPostComment;
  likePost: BlogPost;
  login: AuthPayload;
  logout: GeneralResponse;
  markAllNotificationsAsRead: GeneralResponse;
  markNotificationAsRead: Notification;
  mergeCategories: GeneralResponse;
  mergeTags: GeneralResponse;
  publishPost: BlogPost;
  rebuildSearchIndex: GeneralResponse;
  refreshToken: AuthPayload;
  register: AuthPayload;
  rejectComment: BlogPostComment;
  reportComment: BlogPostComment;
  requestPasswordReset: GeneralResponse;
  sendVerificationCode: GeneralResponse;
  syncNotion: GeneralResponse;
  unlikeComment: BlogPostComment;
  unlikePost: BlogPost;
  updateComment: BlogPostComment;
  updateGitHubConfig: GeneralResponse;
  updatePost: BlogPost;
  updateProfile: User;
  uploadImage: ImageUploadResponse;
  verifyEmail: GeneralResponse;
  verifyEmailAndLogin: AuthPayload;
};


export type MutationAdminCreateUserArgs = {
  input: AdminCreateUserInput;
};


export type MutationAdminDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAdminUpdateUserArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  role?: InputMaybe<UserRole>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationArchivePostArgs = {
  id: Scalars['ID']['input'];
};


export type MutationBatchUpdateCategoriesArgs = {
  input: BatchUpdateCategoriesInput;
};


export type MutationBatchUpdateTagsArgs = {
  input: BatchUpdateTagsInput;
};


export type MutationChangePasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationConfirmPasswordResetArgs = {
  input: ConfirmPasswordResetInput;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationCreateInviteCodeArgs = {
  input: CreateInviteCodeInput;
};


export type MutationCreatePostArgs = {
  input: CreatePostInput;
};


export type MutationDeactivateInviteCodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNotificationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePostArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEmailLoginArgs = {
  input: EmailLoginInput;
};


export type MutationLikeCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLikePostArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationLogoutArgs = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkNotificationAsReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationMergeCategoriesArgs = {
  sourceCategory: Scalars['String']['input'];
  targetCategory: Scalars['String']['input'];
};


export type MutationMergeTagsArgs = {
  sourceTag: Scalars['String']['input'];
  targetTag: Scalars['String']['input'];
};


export type MutationPublishPostArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRejectCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationReportCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


export type MutationSendVerificationCodeArgs = {
  email: Scalars['String']['input'];
  type: VerificationType;
};


export type MutationSyncNotionArgs = {
  pageId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUnlikeCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnlikePostArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateCommentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
};


export type MutationUpdateGitHubConfigArgs = {
  repo: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationUpdatePostArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePostInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUploadImageArgs = {
  file: Scalars['Upload']['input'];
};


export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
};


export type MutationVerifyEmailAndLoginArgs = {
  input: VerifyEmailInput;
};

export type Notification = {
  __typename?: 'Notification';
  content: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  isRead: Scalars['Boolean']['output'];
  recipient: User;
  relatedComment?: Maybe<BlogPostComment>;
  relatedPost?: Maybe<BlogPost>;
  relatedUser?: Maybe<User>;
  title: Scalars['String']['output'];
  type: NotificationType;
};

export type NotificationType =
  | 'COMMENT_REPLY'
  | 'POST_COMMENT'
  | 'POST_LIKE'
  | 'SYSTEM';

export type NotionPage = {
  __typename?: 'NotionPage';
  id: Scalars['String']['output'];
  lastEditedAt: Scalars['Time']['output'];
  title: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type PopularQuery = {
  __typename?: 'PopularQuery';
  count: Scalars['Int']['output'];
  lastSearched: Scalars['Time']['output'];
  query: Scalars['String']['output'];
};

export type PostFilterInput = {
  accessLevel?: InputMaybe<AccessLevel>;
  authorId?: InputMaybe<Scalars['ID']['input']>;
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PostStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type PostSortInput = {
  field?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
};

export type PostStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type Query = {
  __typename?: 'Query';
  comment?: Maybe<BlogPostComment>;
  comments: CommentResult;
  enhancedSearch: EnhancedSearchResult;
  generateMechanismTree: MechanismNode;
  getCategories: Array<CategoryInfo>;
  getGitHubConfig: GitHubConfig;
  getNotionPages: Array<NotionPage>;
  getPopularPosts: Array<BlogPost>;
  getRecentPosts: Array<BlogPost>;
  getSearchStats: SearchStats;
  getSearchSuggestions: Array<Scalars['String']['output']>;
  getTagCategoryStats: TagCategoryStats;
  getTags: Array<TagInfo>;
  getTrendingSearches: Array<Scalars['String']['output']>;
  getTrendingTags: Array<Scalars['String']['output']>;
  inviteCodes: Array<InviteCode>;
  me?: Maybe<User>;
  notifications: Array<Notification>;
  post?: Maybe<BlogPost>;
  postVersions: Array<BlogPostVersion>;
  posts: Array<BlogPost>;
  searchPosts: SearchResult;
  serverDashboard: ServerDashboard;
  unreadNotificationCount: Scalars['Int']['output'];
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryCommentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommentsArgs = {
  blogPostId?: InputMaybe<Scalars['ID']['input']>;
  filter?: InputMaybe<CommentFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CommentSortInput>;
};


export type QueryEnhancedSearchArgs = {
  input: SearchInput;
};


export type QueryGenerateMechanismTreeArgs = {
  query: Scalars['String']['input'];
};


export type QueryGetCategoriesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetPopularPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetRecentPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetSearchSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryGetTagsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetTrendingSearchesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetTrendingTagsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryInviteCodesArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPostArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPostVersionsArgs = {
  postId: Scalars['ID']['input'];
};


export type QueryPostsArgs = {
  filter?: InputMaybe<PostFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<PostSortInput>;
};


export type QuerySearchPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<UserRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  inviteCode?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type RequestPasswordResetInput = {
  email: Scalars['String']['input'];
};

export type SearchFacetItem = {
  __typename?: 'SearchFacetItem';
  count: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};

export type SearchFacets = {
  __typename?: 'SearchFacets';
  authors: Array<SearchFacetItem>;
  categories: Array<SearchFacetItem>;
  tags: Array<SearchFacetItem>;
};

export type SearchFilters = {
  authorId?: InputMaybe<Scalars['ID']['input']>;
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  minLikes?: InputMaybe<Scalars['Int']['input']>;
  minViews?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SearchInput = {
  filters?: InputMaybe<SearchFilters>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type SearchResult = {
  __typename?: 'SearchResult';
  posts: Array<BlogPost>;
  took: Scalars['String']['output'];
  total: Scalars['Int']['output'];
};

export type SearchStats = {
  __typename?: 'SearchStats';
  popularQueries: Array<PopularQuery>;
  searchTrends: Array<SearchTrend>;
  totalSearches: Scalars['Int']['output'];
};

export type SearchTrend = {
  __typename?: 'SearchTrend';
  date: Scalars['String']['output'];
  searchCount: Scalars['Int']['output'];
  topQueries: Array<Scalars['String']['output']>;
};

export type ServerDashboard = {
  __typename?: 'ServerDashboard';
  cpuCount: Scalars['Int']['output'];
  goVersion: Scalars['String']['output'];
  goroutines: Scalars['Int']['output'];
  hostname: Scalars['String']['output'];
  memory: ServerMemoryStats;
  postCount: Scalars['Int']['output'];
  serverTime: Scalars['Time']['output'];
  todayPosts: Scalars['Int']['output'];
  todayRegistrations: Scalars['Int']['output'];
  uptime: Scalars['String']['output'];
  userCount: Scalars['Int']['output'];
};

export type ServerMemoryStats = {
  __typename?: 'ServerMemoryStats';
  alloc: Scalars['String']['output'];
  heapAlloc: Scalars['String']['output'];
  heapSys: Scalars['String']['output'];
  sys: Scalars['String']['output'];
  totalAlloc: Scalars['String']['output'];
};

export type TagCategoryStats = {
  __typename?: 'TagCategoryStats';
  categories: Array<CategoryInfo>;
  tags: Array<TagInfo>;
  totalCategories: Scalars['Int']['output'];
  totalTags: Scalars['Int']['output'];
};

export type TagInfo = {
  __typename?: 'TagInfo';
  count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  posts: Array<BlogPost>;
};

export type TagOperation =
  | 'ADD'
  | 'REPLACE';

export type UpdateCommentInput = {
  content: Scalars['String']['input'];
};

export type UpdatePostInput = {
  accessLevel?: InputMaybe<AccessLevel>;
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  changeLog?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PostStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  avatar?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Time']['output'];
  email: Scalars['String']['output'];
  emailVerifiedAt?: Maybe<Scalars['Time']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastLoginAt?: Maybe<Scalars['Time']['output']>;
  posts: Array<BlogPost>;
  postsCount: Scalars['Int']['output'];
  role: UserRole;
  updatedAt: Scalars['Time']['output'];
  username: Scalars['String']['output'];
};


export type UserPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type UserRole =
  | 'ADMIN'
  | 'USER';

export type VerificationType =
  | 'LOGIN'
  | 'REGISTER'
  | 'RESET_PASSWORD';

export type VerifyEmailInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  type: VerificationType;
};

export type NotificationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type NotificationsQueryData = { __typename?: 'Query', notifications: Array<{ __typename?: 'Notification', id: string, type: NotificationType, title: string, content: string, isRead: boolean, createdAt: string, relatedPost?: { __typename?: 'BlogPost', id: string, title: string, slug: string } | null, relatedComment?: { __typename?: 'BlogPostComment', id: string, content: string } | null, relatedUser?: { __typename?: 'User', id: string, username: string, avatar?: string | null } | null }> };

export type UnreadNotificationCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadNotificationCountQueryData = { __typename?: 'Query', unreadNotificationCount: number };

export type MarkNotificationAsReadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkNotificationAsReadMutationData = { __typename?: 'Mutation', markNotificationAsRead: { __typename?: 'Notification', id: string, isRead: boolean } };

export type MarkAllNotificationsAsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationsAsReadMutationData = { __typename?: 'Mutation', markAllNotificationsAsRead: { __typename?: 'GeneralResponse', success: boolean, message?: string | null } };

export type DeleteNotificationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteNotificationMutationData = { __typename?: 'Mutation', deleteNotification: { __typename?: 'GeneralResponse', success: boolean, message?: string | null } };

export type ClearAllNotificationsMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearAllNotificationsMutationData = { __typename?: 'Mutation', clearAllNotifications: { __typename?: 'GeneralResponse', success: boolean, message?: string | null } };

export type GetTagsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTagsQueryData = { __typename?: 'Query', getTags: Array<{ __typename?: 'TagInfo', name: string, count: number, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string }> }> };

export type GetCategoriesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCategoriesQueryData = { __typename?: 'Query', getCategories: Array<{ __typename?: 'CategoryInfo', name: string, count: number, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string }> }> };

export type GetTagCategoryStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTagCategoryStatsQueryData = { __typename?: 'Query', getTagCategoryStats: { __typename?: 'TagCategoryStats', totalTags: number, totalCategories: number, tags: Array<{ __typename?: 'TagInfo', name: string, count: number, posts: Array<{ __typename?: 'BlogPost', id: string, title: string }> }>, categories: Array<{ __typename?: 'CategoryInfo', name: string, count: number, posts: Array<{ __typename?: 'BlogPost', id: string, title: string }> }> } };

export type MergeTagsMutationVariables = Exact<{
  sourceTag: Scalars['String']['input'];
  targetTag: Scalars['String']['input'];
}>;


export type MergeTagsMutationData = { __typename?: 'Mutation', mergeTags: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type MergeCategoriesMutationVariables = Exact<{
  sourceCategory: Scalars['String']['input'];
  targetCategory: Scalars['String']['input'];
}>;


export type MergeCategoriesMutationData = { __typename?: 'Mutation', mergeCategories: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type BatchUpdateTagsMutationVariables = Exact<{
  input: BatchUpdateTagsInput;
}>;


export type BatchUpdateTagsMutationData = { __typename?: 'Mutation', batchUpdateTags: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type BatchUpdateCategoriesMutationVariables = Exact<{
  input: BatchUpdateCategoriesInput;
}>;


export type BatchUpdateCategoriesMutationData = { __typename?: 'Mutation', batchUpdateCategories: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type DeleteUnusedTagsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteUnusedTagsMutationData = { __typename?: 'Mutation', deleteUnusedTags: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type DeleteUnusedCategoriesMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteUnusedCategoriesMutationData = { __typename?: 'Mutation', deleteUnusedCategories: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type UsersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<UserRole>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type UsersQueryData = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, createdAt: string, postsCount: number }> };

export type ServerDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type ServerDashboardQueryData = { __typename?: 'Query', serverDashboard: { __typename?: 'ServerDashboard', serverTime: string, hostname: string, goVersion: string, cpuCount: number, goroutines: number, uptime: string, userCount: number, postCount: number, todayRegistrations: number, todayPosts: number, memory: { __typename?: 'ServerMemoryStats', alloc: string, totalAlloc: string, sys: string, heapAlloc: string, heapSys: string } } };

export type InviteCodesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type InviteCodesQueryData = { __typename?: 'Query', inviteCodes: Array<{ __typename?: 'InviteCode', id: string, code: string, usedAt?: string | null, expiresAt: string, maxUses: number, currentUses: number, isActive: boolean, description?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, usedBy?: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } | null }> };

export type AllCommentsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  filter?: InputMaybe<CommentFilterInput>;
  sort?: InputMaybe<CommentSortInput>;
}>;


export type AllCommentsQueryData = { __typename?: 'Query', comments: { __typename?: 'CommentResult', total: number, comments: Array<{ __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null }, blogPost: { __typename?: 'BlogPost', id: string, title: string, slug: string } }> } };

export type AdminCreateUserMutationVariables = Exact<{
  input: AdminCreateUserInput;
}>;


export type AdminCreateUserMutationData = { __typename?: 'Mutation', adminCreateUser: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, createdAt: string } };

export type AdminUpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<UserRole>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type AdminUpdateUserMutationData = { __typename?: 'Mutation', adminUpdateUser: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, updatedAt: string } };

export type AdminDeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AdminDeleteUserMutationData = { __typename?: 'Mutation', adminDeleteUser: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type CreateInviteCodeMutationVariables = Exact<{
  input: CreateInviteCodeInput;
}>;


export type CreateInviteCodeMutationData = { __typename?: 'Mutation', createInviteCode: { __typename?: 'InviteCode', id: string, code: string, usedAt?: string | null, expiresAt: string, maxUses: number, currentUses: number, isActive: boolean, description?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, usedBy?: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } | null } };

export type DeactivateInviteCodeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeactivateInviteCodeMutationData = { __typename?: 'Mutation', deactivateInviteCode: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type ClearCacheMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearCacheMutationData = { __typename?: 'Mutation', clearCache: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type RebuildSearchIndexMutationVariables = Exact<{ [key: string]: never; }>;


export type RebuildSearchIndexMutationData = { __typename?: 'Mutation', rebuildSearchIndex: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type ApproveCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ApproveCommentMutationData = { __typename?: 'Mutation', approveComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type RejectCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RejectCommentMutationData = { __typename?: 'Mutation', rejectComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQueryData = { __typename?: 'Query', me?: { __typename?: 'User', postsCount: number, id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, status: PostStatus, publishedAt?: string | null }> } | null };

export type UserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserQueryData = { __typename?: 'Query', user?: { __typename?: 'User', postsCount: number, id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }> } | null };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutationData = { __typename?: 'Mutation', register: { __typename?: 'AuthPayload', token: string, refreshToken: string, expiresAt: string, user: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string } } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutationData = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', token: string, refreshToken: string, expiresAt: string, user: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string } } };

export type EmailLoginMutationVariables = Exact<{
  input: EmailLoginInput;
}>;


export type EmailLoginMutationData = { __typename?: 'Mutation', emailLogin: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type VerifyEmailAndLoginMutationVariables = Exact<{
  input: VerifyEmailInput;
}>;


export type VerifyEmailAndLoginMutationData = { __typename?: 'Mutation', verifyEmailAndLogin: { __typename?: 'AuthPayload', token: string, refreshToken: string, expiresAt: string, user: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutationData = { __typename?: 'Mutation', logout: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type RefreshTokenMutationVariables = Exact<{
  refreshToken: Scalars['String']['input'];
}>;


export type RefreshTokenMutationData = { __typename?: 'Mutation', refreshToken: { __typename?: 'AuthPayload', token: string, refreshToken: string, expiresAt: string, user: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string } } };

export type SendVerificationCodeMutationVariables = Exact<{
  email: Scalars['String']['input'];
  type: VerificationType;
}>;


export type SendVerificationCodeMutationData = { __typename?: 'Mutation', sendVerificationCode: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type VerifyEmailMutationVariables = Exact<{
  input: VerifyEmailInput;
}>;


export type VerifyEmailMutationData = { __typename?: 'Mutation', verifyEmail: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type RequestPasswordResetMutationVariables = Exact<{
  input: RequestPasswordResetInput;
}>;


export type RequestPasswordResetMutationData = { __typename?: 'Mutation', requestPasswordReset: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type ConfirmPasswordResetMutationVariables = Exact<{
  input: ConfirmPasswordResetInput;
}>;


export type ConfirmPasswordResetMutationData = { __typename?: 'Mutation', confirmPasswordReset: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutationData = { __typename?: 'Mutation', updateProfile: { __typename?: 'User', id: string, username: string, email: string, bio?: string | null, avatar?: string | null, updatedAt: string } };

export type ChangePasswordMutationVariables = Exact<{
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutationData = { __typename?: 'Mutation', changePassword: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type PostsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  filter?: InputMaybe<PostFilterInput>;
  sort?: InputMaybe<PostSortInput>;
}>;


export type PostsQueryData = { __typename?: 'Query', posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }> };

export type PostQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type PostQueryData = { __typename?: 'Query', post?: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } | null };

export type PostVersionsQueryVariables = Exact<{
  postId: Scalars['ID']['input'];
}>;


export type PostVersionsQueryData = { __typename?: 'Query', postVersions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> };

export type SearchPostsQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchPostsQueryData = { __typename?: 'Query', searchPosts: { __typename?: 'SearchResult', total: number, took: string, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }> } };

export type PopularPostsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type PopularPostsQueryData = { __typename?: 'Query', getPopularPosts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }> };

export type RecentPostsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RecentPostsQueryData = { __typename?: 'Query', getRecentPosts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }> };

export type TrendingTagsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TrendingTagsQueryData = { __typename?: 'Query', getTrendingTags: Array<string> };

export type CreatePostMutationVariables = Exact<{
  input: CreatePostInput;
}>;


export type CreatePostMutationData = { __typename?: 'Mutation', createPost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type UpdatePostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePostInput;
}>;


export type UpdatePostMutationData = { __typename?: 'Mutation', updatePost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type DeletePostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePostMutationData = { __typename?: 'Mutation', deletePost: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type PublishPostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishPostMutationData = { __typename?: 'Mutation', publishPost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type ArchivePostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ArchivePostMutationData = { __typename?: 'Mutation', archivePost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type LikePostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LikePostMutationData = { __typename?: 'Mutation', likePost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type UnlikePostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnlikePostMutationData = { __typename?: 'Mutation', unlikePost: { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> } };

export type CommentsQueryVariables = Exact<{
  blogPostId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  filter?: InputMaybe<CommentFilterInput>;
  sort?: InputMaybe<CommentSortInput>;
}>;


export type CommentsQueryData = { __typename?: 'Query', comments: { __typename?: 'CommentResult', total: number, comments: Array<{ __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null }, parent?: { __typename?: 'BlogPostComment', id: string, content: string, createdAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } | null, replies: Array<{ __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } }>, blogPost: { __typename?: 'BlogPost', id: string, title: string, slug: string } }> } };

export type CommentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CommentQueryData = { __typename?: 'Query', comment?: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null }, parent?: { __typename?: 'BlogPostComment', id: string, content: string, createdAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } | null, replies: Array<{ __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } }>, blogPost: { __typename?: 'BlogPost', id: string, title: string, slug: string } } | null };

export type CreateCommentMutationVariables = Exact<{
  input: CreateCommentInput;
}>;


export type CreateCommentMutationData = { __typename?: 'Mutation', createComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type UpdateCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
}>;


export type UpdateCommentMutationData = { __typename?: 'Mutation', updateComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type DeleteCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCommentMutationData = { __typename?: 'Mutation', deleteComment: { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null } };

export type LikeCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LikeCommentMutationData = { __typename?: 'Mutation', likeComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type UnlikeCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnlikeCommentMutationData = { __typename?: 'Mutation', unlikeComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type ReportCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReportCommentMutationData = { __typename?: 'Mutation', reportComment: { __typename?: 'BlogPostComment', id: string, content: string, isApproved: boolean, likeCount: number, reportCount: number, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, avatar?: string | null } } };

export type UserInfoFragment = { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string };

export type UserSummaryFragment = { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole };

export type BlogPostInfoFragment = { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null };

export type BlogPostSummaryFragment = { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } };

export type BlogPostDetailFragment = { __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, content: string, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, accessLevel: AccessLevel, status: PostStatus, publishedAt?: string | null, lastEditedAt?: string | null, createdAt: string, updatedAt: string, version: number, isLiked: boolean, notionPageId?: string | null, author: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null }, versions: Array<{ __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } }> };

export type BlogPostStatsFragment = { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null };

export type BlogPostVersionFragment = { __typename?: 'BlogPostVersion', id: string, versionNum: number, title: string, content: string, changeLog?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } };

export type InviteCodeInfoFragment = { __typename?: 'InviteCode', id: string, code: string, usedAt?: string | null, expiresAt: string, maxUses: number, currentUses: number, isActive: boolean, description?: string | null, createdAt: string, createdBy: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, usedBy?: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole } | null };

export type AuthPayloadInfoFragment = { __typename?: 'AuthPayload', token: string, refreshToken: string, expiresAt: string, user: { __typename?: 'User', id: string, username: string, email: string, role: UserRole, isVerified: boolean, isActive: boolean, avatar?: string | null, bio?: string | null, lastLoginAt?: string | null, emailVerifiedAt?: string | null, createdAt: string, updatedAt: string } };

export type ServerDashboardInfoFragment = { __typename?: 'ServerDashboard', serverTime: string, hostname: string, goVersion: string, cpuCount: number, goroutines: number, uptime: string, userCount: number, postCount: number, todayRegistrations: number, todayPosts: number, memory: { __typename?: 'ServerMemoryStats', alloc: string, totalAlloc: string, sys: string, heapAlloc: string, heapSys: string } };

export type GeneralResponseInfoFragment = { __typename?: 'GeneralResponse', success: boolean, message?: string | null, code?: string | null };

export type GenerateMechanismTreeQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;


export type GenerateMechanismTreeQueryData = { __typename?: 'Query', generateMechanismTree: { __typename?: 'MechanismNode', id: string, title: string, active_ingredient?: string | null, children?: Array<{ __typename?: 'MechanismNode', id: string, title: string, active_ingredient?: string | null, children?: Array<{ __typename?: 'MechanismNode', id: string, title: string, active_ingredient?: string | null, children?: Array<{ __typename?: 'MechanismNode', id: string, title: string, active_ingredient?: string | null }> | null }> | null }> | null } };

export type EnhancedSearchQueryVariables = Exact<{
  input: SearchInput;
}>;


export type EnhancedSearchQueryData = { __typename?: 'Query', enhancedSearch: { __typename?: 'EnhancedSearchResult', total: number, took: string, suggestions: Array<string>, posts: Array<{ __typename?: 'BlogPost', id: string, title: string, slug: string, excerpt?: string | null, tags: Array<string>, categories: Array<string>, coverImageUrl?: string | null, status: PostStatus, publishedAt?: string | null, createdAt: string, isLiked: boolean, author: { __typename?: 'User', id: string, username: string, avatar?: string | null, role: UserRole }, stats: { __typename?: 'BlogPostStats', id: string, viewCount: number, likeCount: number, shareCount: number, commentCount: number, lastViewedAt?: string | null, updatedAt?: string | null } }>, facets: { __typename?: 'SearchFacets', tags: Array<{ __typename?: 'SearchFacetItem', value: string, count: number }>, categories: Array<{ __typename?: 'SearchFacetItem', value: string, count: number }>, authors: Array<{ __typename?: 'SearchFacetItem', value: string, count: number }> } } };

export type SearchSuggestionsQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchSuggestionsQueryData = { __typename?: 'Query', getSearchSuggestions: Array<string> };

export type TrendingSearchesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TrendingSearchesQueryData = { __typename?: 'Query', getTrendingSearches: Array<string> };

export type SearchStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type SearchStatsQueryData = { __typename?: 'Query', getSearchStats: { __typename?: 'SearchStats', totalSearches: number, popularQueries: Array<{ __typename?: 'PopularQuery', query: string, count: number, lastSearched: string }>, searchTrends: Array<{ __typename?: 'SearchTrend', date: string, searchCount: number, topQueries: Array<string> }> } };

export const UserSummaryFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]} as unknown as DocumentNode;
export const BlogPostStatsFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BlogPostSummaryFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BlogPostInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}}]} as unknown as DocumentNode;
export const UserInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BlogPostDetailFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const BlogPostVersionFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostVersion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostVersion"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]} as unknown as DocumentNode;
export const InviteCodeInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"currentUses"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]} as unknown as DocumentNode;
export const AuthPayloadInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthPayloadInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthPayload"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export const ServerDashboardInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerDashboardInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerDashboard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverTime"}},{"kind":"Field","name":{"kind":"Name","value":"hostname"}},{"kind":"Field","name":{"kind":"Name","value":"goVersion"}},{"kind":"Field","name":{"kind":"Name","value":"cpuCount"}},{"kind":"Field","name":{"kind":"Name","value":"goroutines"}},{"kind":"Field","name":{"kind":"Name","value":"memory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"alloc"}},{"kind":"Field","name":{"kind":"Name","value":"totalAlloc"}},{"kind":"Field","name":{"kind":"Name","value":"sys"}},{"kind":"Field","name":{"kind":"Name","value":"heapAlloc"}},{"kind":"Field","name":{"kind":"Name","value":"heapSys"}}]}},{"kind":"Field","name":{"kind":"Name","value":"uptime"}},{"kind":"Field","name":{"kind":"Name","value":"userCount"}},{"kind":"Field","name":{"kind":"Name","value":"postCount"}},{"kind":"Field","name":{"kind":"Name","value":"todayRegistrations"}},{"kind":"Field","name":{"kind":"Name","value":"todayPosts"}}]}}]} as unknown as DocumentNode;
export const GeneralResponseInfoFragmentDoc = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export const NotificationsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Notifications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isRead"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"relatedPost"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedComment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export function useNotificationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<NotificationsQueryData, NotificationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<NotificationsQueryData, NotificationsQueryVariables>(NotificationsDocument, options);
      }
export function useNotificationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<NotificationsQueryData, NotificationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<NotificationsQueryData, NotificationsQueryVariables>(NotificationsDocument, options);
        }
// @ts-ignore
export function useNotificationsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<NotificationsQueryData, NotificationsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<NotificationsQueryData, NotificationsQueryVariables>;
export function useNotificationsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<NotificationsQueryData, NotificationsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<NotificationsQueryData | undefined, NotificationsQueryVariables>;
export function useNotificationsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<NotificationsQueryData, NotificationsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<NotificationsQueryData, NotificationsQueryVariables>(NotificationsDocument, options);
        }
export type NotificationsQueryHookResult = ReturnType<typeof useNotificationsQuery>;
export type NotificationsLazyQueryHookResult = ReturnType<typeof useNotificationsLazyQuery>;
export type NotificationsSuspenseQueryHookResult = ReturnType<typeof useNotificationsSuspenseQuery>;
export type NotificationsQueryResult = Apollo.QueryResult<NotificationsQueryData, NotificationsQueryVariables>;
export const UnreadNotificationCountDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UnreadNotificationCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unreadNotificationCount"}}]}}]} as unknown as DocumentNode;
export function useUnreadNotificationCountQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>(UnreadNotificationCountDocument, options);
      }
export function useUnreadNotificationCountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>(UnreadNotificationCountDocument, options);
        }
// @ts-ignore
export function useUnreadNotificationCountSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>;
export function useUnreadNotificationCountSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UnreadNotificationCountQueryData | undefined, UnreadNotificationCountQueryVariables>;
export function useUnreadNotificationCountSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>(UnreadNotificationCountDocument, options);
        }
export type UnreadNotificationCountQueryHookResult = ReturnType<typeof useUnreadNotificationCountQuery>;
export type UnreadNotificationCountLazyQueryHookResult = ReturnType<typeof useUnreadNotificationCountLazyQuery>;
export type UnreadNotificationCountSuspenseQueryHookResult = ReturnType<typeof useUnreadNotificationCountSuspenseQuery>;
export type UnreadNotificationCountQueryResult = Apollo.QueryResult<UnreadNotificationCountQueryData, UnreadNotificationCountQueryVariables>;
export const MarkNotificationAsReadDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationAsRead"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationAsRead"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isRead"}}]}}]}}]} as unknown as DocumentNode;
export type MarkNotificationAsReadMutationFn = Apollo.MutationFunction<MarkNotificationAsReadMutationData, MarkNotificationAsReadMutationVariables>;
export function useMarkNotificationAsReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkNotificationAsReadMutationData, MarkNotificationAsReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkNotificationAsReadMutationData, MarkNotificationAsReadMutationVariables>(MarkNotificationAsReadDocument, options);
      }
export type MarkNotificationAsReadMutationHookResult = ReturnType<typeof useMarkNotificationAsReadMutation>;
export type MarkNotificationAsReadMutationResult = Apollo.MutationResult<MarkNotificationAsReadMutationData>;
export type MarkNotificationAsReadMutationOptions = Apollo.BaseMutationOptions<MarkNotificationAsReadMutationData, MarkNotificationAsReadMutationVariables>;
export const MarkAllNotificationsAsReadDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markAllNotificationsAsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type MarkAllNotificationsAsReadMutationFn = Apollo.MutationFunction<MarkAllNotificationsAsReadMutationData, MarkAllNotificationsAsReadMutationVariables>;
export function useMarkAllNotificationsAsReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkAllNotificationsAsReadMutationData, MarkAllNotificationsAsReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkAllNotificationsAsReadMutationData, MarkAllNotificationsAsReadMutationVariables>(MarkAllNotificationsAsReadDocument, options);
      }
export type MarkAllNotificationsAsReadMutationHookResult = ReturnType<typeof useMarkAllNotificationsAsReadMutation>;
export type MarkAllNotificationsAsReadMutationResult = Apollo.MutationResult<MarkAllNotificationsAsReadMutationData>;
export type MarkAllNotificationsAsReadMutationOptions = Apollo.BaseMutationOptions<MarkAllNotificationsAsReadMutationData, MarkAllNotificationsAsReadMutationVariables>;
export const DeleteNotificationDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNotification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNotification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type DeleteNotificationMutationFn = Apollo.MutationFunction<DeleteNotificationMutationData, DeleteNotificationMutationVariables>;
export function useDeleteNotificationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteNotificationMutationData, DeleteNotificationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteNotificationMutationData, DeleteNotificationMutationVariables>(DeleteNotificationDocument, options);
      }
export type DeleteNotificationMutationHookResult = ReturnType<typeof useDeleteNotificationMutation>;
export type DeleteNotificationMutationResult = Apollo.MutationResult<DeleteNotificationMutationData>;
export type DeleteNotificationMutationOptions = Apollo.BaseMutationOptions<DeleteNotificationMutationData, DeleteNotificationMutationVariables>;
export const ClearAllNotificationsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearAllNotifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearAllNotifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode;
export type ClearAllNotificationsMutationFn = Apollo.MutationFunction<ClearAllNotificationsMutationData, ClearAllNotificationsMutationVariables>;
export function useClearAllNotificationsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ClearAllNotificationsMutationData, ClearAllNotificationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ClearAllNotificationsMutationData, ClearAllNotificationsMutationVariables>(ClearAllNotificationsDocument, options);
      }
export type ClearAllNotificationsMutationHookResult = ReturnType<typeof useClearAllNotificationsMutation>;
export type ClearAllNotificationsMutationResult = Apollo.MutationResult<ClearAllNotificationsMutationData>;
export type ClearAllNotificationsMutationOptions = Apollo.BaseMutationOptions<ClearAllNotificationsMutationData, ClearAllNotificationsMutationVariables>;
export const GetTagsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode;
export function useGetTagsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTagsQueryData, GetTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTagsQueryData, GetTagsQueryVariables>(GetTagsDocument, options);
      }
export function useGetTagsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTagsQueryData, GetTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTagsQueryData, GetTagsQueryVariables>(GetTagsDocument, options);
        }
// @ts-ignore
export function useGetTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetTagsQueryData, GetTagsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetTagsQueryData, GetTagsQueryVariables>;
export function useGetTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetTagsQueryData, GetTagsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetTagsQueryData | undefined, GetTagsQueryVariables>;
export function useGetTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetTagsQueryData, GetTagsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetTagsQueryData, GetTagsQueryVariables>(GetTagsDocument, options);
        }
export type GetTagsQueryHookResult = ReturnType<typeof useGetTagsQuery>;
export type GetTagsLazyQueryHookResult = ReturnType<typeof useGetTagsLazyQuery>;
export type GetTagsSuspenseQueryHookResult = ReturnType<typeof useGetTagsSuspenseQuery>;
export type GetTagsQueryResult = Apollo.QueryResult<GetTagsQueryData, GetTagsQueryVariables>;
export const GetCategoriesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode;
export function useGetCategoriesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetCategoriesQueryData, GetCategoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCategoriesQueryData, GetCategoriesQueryVariables>(GetCategoriesDocument, options);
      }
export function useGetCategoriesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCategoriesQueryData, GetCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCategoriesQueryData, GetCategoriesQueryVariables>(GetCategoriesDocument, options);
        }
// @ts-ignore
export function useGetCategoriesSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetCategoriesQueryData, GetCategoriesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetCategoriesQueryData, GetCategoriesQueryVariables>;
export function useGetCategoriesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetCategoriesQueryData, GetCategoriesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetCategoriesQueryData | undefined, GetCategoriesQueryVariables>;
export function useGetCategoriesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetCategoriesQueryData, GetCategoriesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetCategoriesQueryData, GetCategoriesQueryVariables>(GetCategoriesDocument, options);
        }
export type GetCategoriesQueryHookResult = ReturnType<typeof useGetCategoriesQuery>;
export type GetCategoriesLazyQueryHookResult = ReturnType<typeof useGetCategoriesLazyQuery>;
export type GetCategoriesSuspenseQueryHookResult = ReturnType<typeof useGetCategoriesSuspenseQuery>;
export type GetCategoriesQueryResult = Apollo.QueryResult<GetCategoriesQueryData, GetCategoriesQueryVariables>;
export const GetTagCategoryStatsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTagCategoryStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTagCategoryStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalTags"}},{"kind":"Field","name":{"kind":"Name","value":"totalCategories"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]}}]} as unknown as DocumentNode;
export function useGetTagCategoryStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>(GetTagCategoryStatsDocument, options);
      }
export function useGetTagCategoryStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>(GetTagCategoryStatsDocument, options);
        }
// @ts-ignore
export function useGetTagCategoryStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>;
export function useGetTagCategoryStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetTagCategoryStatsQueryData | undefined, GetTagCategoryStatsQueryVariables>;
export function useGetTagCategoryStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>(GetTagCategoryStatsDocument, options);
        }
export type GetTagCategoryStatsQueryHookResult = ReturnType<typeof useGetTagCategoryStatsQuery>;
export type GetTagCategoryStatsLazyQueryHookResult = ReturnType<typeof useGetTagCategoryStatsLazyQuery>;
export type GetTagCategoryStatsSuspenseQueryHookResult = ReturnType<typeof useGetTagCategoryStatsSuspenseQuery>;
export type GetTagCategoryStatsQueryResult = Apollo.QueryResult<GetTagCategoryStatsQueryData, GetTagCategoryStatsQueryVariables>;
export const MergeTagsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MergeTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceTag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetTag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mergeTags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceTag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceTag"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetTag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetTag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type MergeTagsMutationFn = Apollo.MutationFunction<MergeTagsMutationData, MergeTagsMutationVariables>;
export function useMergeTagsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MergeTagsMutationData, MergeTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MergeTagsMutationData, MergeTagsMutationVariables>(MergeTagsDocument, options);
      }
export type MergeTagsMutationHookResult = ReturnType<typeof useMergeTagsMutation>;
export type MergeTagsMutationResult = Apollo.MutationResult<MergeTagsMutationData>;
export type MergeTagsMutationOptions = Apollo.BaseMutationOptions<MergeTagsMutationData, MergeTagsMutationVariables>;
export const MergeCategoriesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MergeCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceCategory"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetCategory"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mergeCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceCategory"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceCategory"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetCategory"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetCategory"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type MergeCategoriesMutationFn = Apollo.MutationFunction<MergeCategoriesMutationData, MergeCategoriesMutationVariables>;
export function useMergeCategoriesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MergeCategoriesMutationData, MergeCategoriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MergeCategoriesMutationData, MergeCategoriesMutationVariables>(MergeCategoriesDocument, options);
      }
export type MergeCategoriesMutationHookResult = ReturnType<typeof useMergeCategoriesMutation>;
export type MergeCategoriesMutationResult = Apollo.MutationResult<MergeCategoriesMutationData>;
export type MergeCategoriesMutationOptions = Apollo.BaseMutationOptions<MergeCategoriesMutationData, MergeCategoriesMutationVariables>;
export const BatchUpdateTagsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BatchUpdateTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BatchUpdateTagsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"batchUpdateTags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type BatchUpdateTagsMutationFn = Apollo.MutationFunction<BatchUpdateTagsMutationData, BatchUpdateTagsMutationVariables>;
export function useBatchUpdateTagsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<BatchUpdateTagsMutationData, BatchUpdateTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<BatchUpdateTagsMutationData, BatchUpdateTagsMutationVariables>(BatchUpdateTagsDocument, options);
      }
export type BatchUpdateTagsMutationHookResult = ReturnType<typeof useBatchUpdateTagsMutation>;
export type BatchUpdateTagsMutationResult = Apollo.MutationResult<BatchUpdateTagsMutationData>;
export type BatchUpdateTagsMutationOptions = Apollo.BaseMutationOptions<BatchUpdateTagsMutationData, BatchUpdateTagsMutationVariables>;
export const BatchUpdateCategoriesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BatchUpdateCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BatchUpdateCategoriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"batchUpdateCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type BatchUpdateCategoriesMutationFn = Apollo.MutationFunction<BatchUpdateCategoriesMutationData, BatchUpdateCategoriesMutationVariables>;
export function useBatchUpdateCategoriesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<BatchUpdateCategoriesMutationData, BatchUpdateCategoriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<BatchUpdateCategoriesMutationData, BatchUpdateCategoriesMutationVariables>(BatchUpdateCategoriesDocument, options);
      }
export type BatchUpdateCategoriesMutationHookResult = ReturnType<typeof useBatchUpdateCategoriesMutation>;
export type BatchUpdateCategoriesMutationResult = Apollo.MutationResult<BatchUpdateCategoriesMutationData>;
export type BatchUpdateCategoriesMutationOptions = Apollo.BaseMutationOptions<BatchUpdateCategoriesMutationData, BatchUpdateCategoriesMutationVariables>;
export const DeleteUnusedTagsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUnusedTags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUnusedTags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type DeleteUnusedTagsMutationFn = Apollo.MutationFunction<DeleteUnusedTagsMutationData, DeleteUnusedTagsMutationVariables>;
export function useDeleteUnusedTagsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteUnusedTagsMutationData, DeleteUnusedTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteUnusedTagsMutationData, DeleteUnusedTagsMutationVariables>(DeleteUnusedTagsDocument, options);
      }
export type DeleteUnusedTagsMutationHookResult = ReturnType<typeof useDeleteUnusedTagsMutation>;
export type DeleteUnusedTagsMutationResult = Apollo.MutationResult<DeleteUnusedTagsMutationData>;
export type DeleteUnusedTagsMutationOptions = Apollo.BaseMutationOptions<DeleteUnusedTagsMutationData, DeleteUnusedTagsMutationVariables>;
export const DeleteUnusedCategoriesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUnusedCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUnusedCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode;
export type DeleteUnusedCategoriesMutationFn = Apollo.MutationFunction<DeleteUnusedCategoriesMutationData, DeleteUnusedCategoriesMutationVariables>;
export function useDeleteUnusedCategoriesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteUnusedCategoriesMutationData, DeleteUnusedCategoriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteUnusedCategoriesMutationData, DeleteUnusedCategoriesMutationVariables>(DeleteUnusedCategoriesDocument, options);
      }
export type DeleteUnusedCategoriesMutationHookResult = ReturnType<typeof useDeleteUnusedCategoriesMutation>;
export type DeleteUnusedCategoriesMutationResult = Apollo.MutationResult<DeleteUnusedCategoriesMutationData>;
export type DeleteUnusedCategoriesMutationOptions = Apollo.BaseMutationOptions<DeleteUnusedCategoriesMutationData, DeleteUnusedCategoriesMutationVariables>;
export const UsersDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Users"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isVerified"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"Argument","name":{"kind":"Name","value":"isVerified"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isVerified"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"postsCount"}}]}}]}}]} as unknown as DocumentNode;
export function useUsersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UsersQueryData, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UsersQueryData, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UsersQueryData, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UsersQueryData, UsersQueryVariables>(UsersDocument, options);
        }
// @ts-ignore
export function useUsersSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<UsersQueryData, UsersQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UsersQueryData, UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UsersQueryData, UsersQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UsersQueryData | undefined, UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UsersQueryData, UsersQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UsersQueryData, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersSuspenseQueryHookResult = ReturnType<typeof useUsersSuspenseQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQueryData, UsersQueryVariables>;
export const ServerDashboardDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ServerDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverDashboard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ServerDashboardInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ServerDashboardInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ServerDashboard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverTime"}},{"kind":"Field","name":{"kind":"Name","value":"hostname"}},{"kind":"Field","name":{"kind":"Name","value":"goVersion"}},{"kind":"Field","name":{"kind":"Name","value":"cpuCount"}},{"kind":"Field","name":{"kind":"Name","value":"goroutines"}},{"kind":"Field","name":{"kind":"Name","value":"memory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"alloc"}},{"kind":"Field","name":{"kind":"Name","value":"totalAlloc"}},{"kind":"Field","name":{"kind":"Name","value":"sys"}},{"kind":"Field","name":{"kind":"Name","value":"heapAlloc"}},{"kind":"Field","name":{"kind":"Name","value":"heapSys"}}]}},{"kind":"Field","name":{"kind":"Name","value":"uptime"}},{"kind":"Field","name":{"kind":"Name","value":"userCount"}},{"kind":"Field","name":{"kind":"Name","value":"postCount"}},{"kind":"Field","name":{"kind":"Name","value":"todayRegistrations"}},{"kind":"Field","name":{"kind":"Name","value":"todayPosts"}}]}}]} as unknown as DocumentNode;
export function useServerDashboardQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ServerDashboardQueryData, ServerDashboardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ServerDashboardQueryData, ServerDashboardQueryVariables>(ServerDashboardDocument, options);
      }
export function useServerDashboardLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ServerDashboardQueryData, ServerDashboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ServerDashboardQueryData, ServerDashboardQueryVariables>(ServerDashboardDocument, options);
        }
// @ts-ignore
export function useServerDashboardSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<ServerDashboardQueryData, ServerDashboardQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<ServerDashboardQueryData, ServerDashboardQueryVariables>;
export function useServerDashboardSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ServerDashboardQueryData, ServerDashboardQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<ServerDashboardQueryData | undefined, ServerDashboardQueryVariables>;
export function useServerDashboardSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ServerDashboardQueryData, ServerDashboardQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ServerDashboardQueryData, ServerDashboardQueryVariables>(ServerDashboardDocument, options);
        }
export type ServerDashboardQueryHookResult = ReturnType<typeof useServerDashboardQuery>;
export type ServerDashboardLazyQueryHookResult = ReturnType<typeof useServerDashboardLazyQuery>;
export type ServerDashboardSuspenseQueryHookResult = ReturnType<typeof useServerDashboardSuspenseQuery>;
export type ServerDashboardQueryResult = Apollo.QueryResult<ServerDashboardQueryData, ServerDashboardQueryVariables>;
export const InviteCodesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InviteCodes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteCodes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"currentUses"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export function useInviteCodesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<InviteCodesQueryData, InviteCodesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<InviteCodesQueryData, InviteCodesQueryVariables>(InviteCodesDocument, options);
      }
export function useInviteCodesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<InviteCodesQueryData, InviteCodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<InviteCodesQueryData, InviteCodesQueryVariables>(InviteCodesDocument, options);
        }
// @ts-ignore
export function useInviteCodesSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<InviteCodesQueryData, InviteCodesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<InviteCodesQueryData, InviteCodesQueryVariables>;
export function useInviteCodesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<InviteCodesQueryData, InviteCodesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<InviteCodesQueryData | undefined, InviteCodesQueryVariables>;
export function useInviteCodesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<InviteCodesQueryData, InviteCodesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<InviteCodesQueryData, InviteCodesQueryVariables>(InviteCodesDocument, options);
        }
export type InviteCodesQueryHookResult = ReturnType<typeof useInviteCodesQuery>;
export type InviteCodesLazyQueryHookResult = ReturnType<typeof useInviteCodesLazyQuery>;
export type InviteCodesSuspenseQueryHookResult = ReturnType<typeof useInviteCodesSuspenseQuery>;
export type InviteCodesQueryResult = Apollo.QueryResult<InviteCodesQueryData, InviteCodesQueryVariables>;
export const AllCommentsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllComments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CommentFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CommentSortInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"blogPost"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode;
export function useAllCommentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AllCommentsQueryData, AllCommentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AllCommentsQueryData, AllCommentsQueryVariables>(AllCommentsDocument, options);
      }
export function useAllCommentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AllCommentsQueryData, AllCommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AllCommentsQueryData, AllCommentsQueryVariables>(AllCommentsDocument, options);
        }
// @ts-ignore
export function useAllCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<AllCommentsQueryData, AllCommentsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<AllCommentsQueryData, AllCommentsQueryVariables>;
export function useAllCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AllCommentsQueryData, AllCommentsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<AllCommentsQueryData | undefined, AllCommentsQueryVariables>;
export function useAllCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AllCommentsQueryData, AllCommentsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<AllCommentsQueryData, AllCommentsQueryVariables>(AllCommentsDocument, options);
        }
export type AllCommentsQueryHookResult = ReturnType<typeof useAllCommentsQuery>;
export type AllCommentsLazyQueryHookResult = ReturnType<typeof useAllCommentsLazyQuery>;
export type AllCommentsSuspenseQueryHookResult = ReturnType<typeof useAllCommentsSuspenseQuery>;
export type AllCommentsQueryResult = Apollo.QueryResult<AllCommentsQueryData, AllCommentsQueryVariables>;
export const AdminCreateUserDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCreateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdminCreateUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCreateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode;
export type AdminCreateUserMutationFn = Apollo.MutationFunction<AdminCreateUserMutationData, AdminCreateUserMutationVariables>;
export function useAdminCreateUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AdminCreateUserMutationData, AdminCreateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AdminCreateUserMutationData, AdminCreateUserMutationVariables>(AdminCreateUserDocument, options);
      }
export type AdminCreateUserMutationHookResult = ReturnType<typeof useAdminCreateUserMutation>;
export type AdminCreateUserMutationResult = Apollo.MutationResult<AdminCreateUserMutationData>;
export type AdminCreateUserMutationOptions = Apollo.BaseMutationOptions<AdminCreateUserMutationData, AdminCreateUserMutationVariables>;
export const AdminUpdateUserDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRole"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isVerified"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}},{"kind":"Argument","name":{"kind":"Name","value":"isVerified"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isVerified"}}},{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode;
export type AdminUpdateUserMutationFn = Apollo.MutationFunction<AdminUpdateUserMutationData, AdminUpdateUserMutationVariables>;
export function useAdminUpdateUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AdminUpdateUserMutationData, AdminUpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AdminUpdateUserMutationData, AdminUpdateUserMutationVariables>(AdminUpdateUserDocument, options);
      }
export type AdminUpdateUserMutationHookResult = ReturnType<typeof useAdminUpdateUserMutation>;
export type AdminUpdateUserMutationResult = Apollo.MutationResult<AdminUpdateUserMutationData>;
export type AdminUpdateUserMutationOptions = Apollo.BaseMutationOptions<AdminUpdateUserMutationData, AdminUpdateUserMutationVariables>;
export const AdminDeleteUserDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminDeleteUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminDeleteUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type AdminDeleteUserMutationFn = Apollo.MutationFunction<AdminDeleteUserMutationData, AdminDeleteUserMutationVariables>;
export function useAdminDeleteUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AdminDeleteUserMutationData, AdminDeleteUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AdminDeleteUserMutationData, AdminDeleteUserMutationVariables>(AdminDeleteUserDocument, options);
      }
export type AdminDeleteUserMutationHookResult = ReturnType<typeof useAdminDeleteUserMutation>;
export type AdminDeleteUserMutationResult = Apollo.MutationResult<AdminDeleteUserMutationData>;
export type AdminDeleteUserMutationOptions = Apollo.BaseMutationOptions<AdminDeleteUserMutationData, AdminDeleteUserMutationVariables>;
export const CreateInviteCodeDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateInviteCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"InviteCodeInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InviteCodeInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InviteCode"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"usedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"maxUses"}},{"kind":"Field","name":{"kind":"Name","value":"currentUses"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode;
export type CreateInviteCodeMutationFn = Apollo.MutationFunction<CreateInviteCodeMutationData, CreateInviteCodeMutationVariables>;
export function useCreateInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateInviteCodeMutationData, CreateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateInviteCodeMutationData, CreateInviteCodeMutationVariables>(CreateInviteCodeDocument, options);
      }
export type CreateInviteCodeMutationHookResult = ReturnType<typeof useCreateInviteCodeMutation>;
export type CreateInviteCodeMutationResult = Apollo.MutationResult<CreateInviteCodeMutationData>;
export type CreateInviteCodeMutationOptions = Apollo.BaseMutationOptions<CreateInviteCodeMutationData, CreateInviteCodeMutationVariables>;
export const DeactivateInviteCodeDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeactivateInviteCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deactivateInviteCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type DeactivateInviteCodeMutationFn = Apollo.MutationFunction<DeactivateInviteCodeMutationData, DeactivateInviteCodeMutationVariables>;
export function useDeactivateInviteCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeactivateInviteCodeMutationData, DeactivateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeactivateInviteCodeMutationData, DeactivateInviteCodeMutationVariables>(DeactivateInviteCodeDocument, options);
      }
export type DeactivateInviteCodeMutationHookResult = ReturnType<typeof useDeactivateInviteCodeMutation>;
export type DeactivateInviteCodeMutationResult = Apollo.MutationResult<DeactivateInviteCodeMutationData>;
export type DeactivateInviteCodeMutationOptions = Apollo.BaseMutationOptions<DeactivateInviteCodeMutationData, DeactivateInviteCodeMutationVariables>;
export const ClearCacheDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearCache"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearCache"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type ClearCacheMutationFn = Apollo.MutationFunction<ClearCacheMutationData, ClearCacheMutationVariables>;
export function useClearCacheMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ClearCacheMutationData, ClearCacheMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ClearCacheMutationData, ClearCacheMutationVariables>(ClearCacheDocument, options);
      }
export type ClearCacheMutationHookResult = ReturnType<typeof useClearCacheMutation>;
export type ClearCacheMutationResult = Apollo.MutationResult<ClearCacheMutationData>;
export type ClearCacheMutationOptions = Apollo.BaseMutationOptions<ClearCacheMutationData, ClearCacheMutationVariables>;
export const RebuildSearchIndexDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RebuildSearchIndex"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rebuildSearchIndex"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type RebuildSearchIndexMutationFn = Apollo.MutationFunction<RebuildSearchIndexMutationData, RebuildSearchIndexMutationVariables>;
export function useRebuildSearchIndexMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RebuildSearchIndexMutationData, RebuildSearchIndexMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RebuildSearchIndexMutationData, RebuildSearchIndexMutationVariables>(RebuildSearchIndexDocument, options);
      }
export type RebuildSearchIndexMutationHookResult = ReturnType<typeof useRebuildSearchIndexMutation>;
export type RebuildSearchIndexMutationResult = Apollo.MutationResult<RebuildSearchIndexMutationData>;
export type RebuildSearchIndexMutationOptions = Apollo.BaseMutationOptions<RebuildSearchIndexMutationData, RebuildSearchIndexMutationVariables>;
export const ApproveCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type ApproveCommentMutationFn = Apollo.MutationFunction<ApproveCommentMutationData, ApproveCommentMutationVariables>;
export function useApproveCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ApproveCommentMutationData, ApproveCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ApproveCommentMutationData, ApproveCommentMutationVariables>(ApproveCommentDocument, options);
      }
export type ApproveCommentMutationHookResult = ReturnType<typeof useApproveCommentMutation>;
export type ApproveCommentMutationResult = Apollo.MutationResult<ApproveCommentMutationData>;
export type ApproveCommentMutationOptions = Apollo.BaseMutationOptions<ApproveCommentMutationData, ApproveCommentMutationVariables>;
export const RejectCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RejectComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rejectComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type RejectCommentMutationFn = Apollo.MutationFunction<RejectCommentMutationData, RejectCommentMutationVariables>;
export function useRejectCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RejectCommentMutationData, RejectCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RejectCommentMutationData, RejectCommentMutationVariables>(RejectCommentDocument, options);
      }
export type RejectCommentMutationHookResult = ReturnType<typeof useRejectCommentMutation>;
export type RejectCommentMutationResult = Apollo.MutationResult<RejectCommentMutationData>;
export type RejectCommentMutationOptions = Apollo.BaseMutationOptions<RejectCommentMutationData, RejectCommentMutationVariables>;
export const MeDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"postsCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function useMeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MeQueryData, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MeQueryData, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MeQueryData, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MeQueryData, MeQueryVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MeQueryData, MeQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<MeQueryData, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MeQueryData, MeQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<MeQueryData | undefined, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MeQueryData, MeQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MeQueryData, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQueryData, MeQueryVariables>;
export const UserDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"User"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"postsCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function useUserQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserQueryData, UserQueryVariables> & ({ variables: UserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserQueryData, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserQueryData, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserQueryData, UserQueryVariables>(UserDocument, options);
        }
// @ts-ignore
export function useUserSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<UserQueryData, UserQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UserQueryData, UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UserQueryData, UserQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<UserQueryData | undefined, UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<UserQueryData, UserQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<UserQueryData, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserSuspenseQueryHookResult = ReturnType<typeof useUserSuspenseQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQueryData, UserQueryVariables>;
export const RegisterDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthPayloadInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthPayloadInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthPayload"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}}]}}]} as unknown as DocumentNode;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutationData, RegisterMutationVariables>;
export function useRegisterMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RegisterMutationData, RegisterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RegisterMutationData, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutationData>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutationData, RegisterMutationVariables>;
export const LoginDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthPayloadInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthPayloadInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthPayload"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}}]}}]} as unknown as DocumentNode;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutationData, LoginMutationVariables>;
export function useLoginMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LoginMutationData, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LoginMutationData, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutationData>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutationData, LoginMutationVariables>;
export const EmailLoginDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EmailLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EmailLoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type EmailLoginMutationFn = Apollo.MutationFunction<EmailLoginMutationData, EmailLoginMutationVariables>;
export function useEmailLoginMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EmailLoginMutationData, EmailLoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EmailLoginMutationData, EmailLoginMutationVariables>(EmailLoginDocument, options);
      }
export type EmailLoginMutationHookResult = ReturnType<typeof useEmailLoginMutation>;
export type EmailLoginMutationResult = Apollo.MutationResult<EmailLoginMutationData>;
export type EmailLoginMutationOptions = Apollo.BaseMutationOptions<EmailLoginMutationData, EmailLoginMutationVariables>;
export const VerifyEmailAndLoginDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmailAndLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmailAndLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthPayloadInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthPayloadInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthPayload"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}}]}}]} as unknown as DocumentNode;
export type VerifyEmailAndLoginMutationFn = Apollo.MutationFunction<VerifyEmailAndLoginMutationData, VerifyEmailAndLoginMutationVariables>;
export function useVerifyEmailAndLoginMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<VerifyEmailAndLoginMutationData, VerifyEmailAndLoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<VerifyEmailAndLoginMutationData, VerifyEmailAndLoginMutationVariables>(VerifyEmailAndLoginDocument, options);
      }
export type VerifyEmailAndLoginMutationHookResult = ReturnType<typeof useVerifyEmailAndLoginMutation>;
export type VerifyEmailAndLoginMutationResult = Apollo.MutationResult<VerifyEmailAndLoginMutationData>;
export type VerifyEmailAndLoginMutationOptions = Apollo.BaseMutationOptions<VerifyEmailAndLoginMutationData, VerifyEmailAndLoginMutationVariables>;
export const LogoutDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutationData, LogoutMutationVariables>;
export function useLogoutMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LogoutMutationData, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LogoutMutationData, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutationData>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutationData, LogoutMutationVariables>;
export const RefreshTokenDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthPayloadInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthPayloadInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthPayload"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}}]}}]} as unknown as DocumentNode;
export type RefreshTokenMutationFn = Apollo.MutationFunction<RefreshTokenMutationData, RefreshTokenMutationVariables>;
export function useRefreshTokenMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RefreshTokenMutationData, RefreshTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RefreshTokenMutationData, RefreshTokenMutationVariables>(RefreshTokenDocument, options);
      }
export type RefreshTokenMutationHookResult = ReturnType<typeof useRefreshTokenMutation>;
export type RefreshTokenMutationResult = Apollo.MutationResult<RefreshTokenMutationData>;
export type RefreshTokenMutationOptions = Apollo.BaseMutationOptions<RefreshTokenMutationData, RefreshTokenMutationVariables>;
export const SendVerificationCodeDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendVerificationCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerificationType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendVerificationCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type SendVerificationCodeMutationFn = Apollo.MutationFunction<SendVerificationCodeMutationData, SendVerificationCodeMutationVariables>;
export function useSendVerificationCodeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SendVerificationCodeMutationData, SendVerificationCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SendVerificationCodeMutationData, SendVerificationCodeMutationVariables>(SendVerificationCodeDocument, options);
      }
export type SendVerificationCodeMutationHookResult = ReturnType<typeof useSendVerificationCodeMutation>;
export type SendVerificationCodeMutationResult = Apollo.MutationResult<SendVerificationCodeMutationData>;
export type SendVerificationCodeMutationOptions = Apollo.BaseMutationOptions<SendVerificationCodeMutationData, SendVerificationCodeMutationVariables>;
export const VerifyEmailDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"VerifyEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type VerifyEmailMutationFn = Apollo.MutationFunction<VerifyEmailMutationData, VerifyEmailMutationVariables>;
export function useVerifyEmailMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<VerifyEmailMutationData, VerifyEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<VerifyEmailMutationData, VerifyEmailMutationVariables>(VerifyEmailDocument, options);
      }
export type VerifyEmailMutationHookResult = ReturnType<typeof useVerifyEmailMutation>;
export type VerifyEmailMutationResult = Apollo.MutationResult<VerifyEmailMutationData>;
export type VerifyEmailMutationOptions = Apollo.BaseMutationOptions<VerifyEmailMutationData, VerifyEmailMutationVariables>;
export const RequestPasswordResetDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestPasswordResetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type RequestPasswordResetMutationFn = Apollo.MutationFunction<RequestPasswordResetMutationData, RequestPasswordResetMutationVariables>;
export function useRequestPasswordResetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestPasswordResetMutationData, RequestPasswordResetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestPasswordResetMutationData, RequestPasswordResetMutationVariables>(RequestPasswordResetDocument, options);
      }
export type RequestPasswordResetMutationHookResult = ReturnType<typeof useRequestPasswordResetMutation>;
export type RequestPasswordResetMutationResult = Apollo.MutationResult<RequestPasswordResetMutationData>;
export type RequestPasswordResetMutationOptions = Apollo.BaseMutationOptions<RequestPasswordResetMutationData, RequestPasswordResetMutationVariables>;
export const ConfirmPasswordResetDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConfirmPasswordResetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type ConfirmPasswordResetMutationFn = Apollo.MutationFunction<ConfirmPasswordResetMutationData, ConfirmPasswordResetMutationVariables>;
export function useConfirmPasswordResetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ConfirmPasswordResetMutationData, ConfirmPasswordResetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ConfirmPasswordResetMutationData, ConfirmPasswordResetMutationVariables>(ConfirmPasswordResetDocument, options);
      }
export type ConfirmPasswordResetMutationHookResult = ReturnType<typeof useConfirmPasswordResetMutation>;
export type ConfirmPasswordResetMutationResult = Apollo.MutationResult<ConfirmPasswordResetMutationData>;
export type ConfirmPasswordResetMutationOptions = Apollo.BaseMutationOptions<ConfirmPasswordResetMutationData, ConfirmPasswordResetMutationVariables>;
export const UpdateProfileDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode;
export type UpdateProfileMutationFn = Apollo.MutationFunction<UpdateProfileMutationData, UpdateProfileMutationVariables>;
export function useUpdateProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateProfileMutationData, UpdateProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateProfileMutationData, UpdateProfileMutationVariables>(UpdateProfileDocument, options);
      }
export type UpdateProfileMutationHookResult = ReturnType<typeof useUpdateProfileMutation>;
export type UpdateProfileMutationResult = Apollo.MutationResult<UpdateProfileMutationData>;
export type UpdateProfileMutationOptions = Apollo.BaseMutationOptions<UpdateProfileMutationData, UpdateProfileMutationVariables>;
export const ChangePasswordDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type ChangePasswordMutationFn = Apollo.MutationFunction<ChangePasswordMutationData, ChangePasswordMutationVariables>;
export function useChangePasswordMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ChangePasswordMutationData, ChangePasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ChangePasswordMutationData, ChangePasswordMutationVariables>(ChangePasswordDocument, options);
      }
export type ChangePasswordMutationHookResult = ReturnType<typeof useChangePasswordMutation>;
export type ChangePasswordMutationResult = Apollo.MutationResult<ChangePasswordMutationData>;
export type ChangePasswordMutationOptions = Apollo.BaseMutationOptions<ChangePasswordMutationData, ChangePasswordMutationVariables>;
export const PostsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Posts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PostFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PostSortInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function usePostsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PostsQueryData, PostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PostsQueryData, PostsQueryVariables>(PostsDocument, options);
      }
export function usePostsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PostsQueryData, PostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PostsQueryData, PostsQueryVariables>(PostsDocument, options);
        }
// @ts-ignore
export function usePostsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<PostsQueryData, PostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostsQueryData, PostsQueryVariables>;
export function usePostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostsQueryData, PostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostsQueryData | undefined, PostsQueryVariables>;
export function usePostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostsQueryData, PostsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<PostsQueryData, PostsQueryVariables>(PostsDocument, options);
        }
export type PostsQueryHookResult = ReturnType<typeof usePostsQuery>;
export type PostsLazyQueryHookResult = ReturnType<typeof usePostsLazyQuery>;
export type PostsSuspenseQueryHookResult = ReturnType<typeof usePostsSuspenseQuery>;
export type PostsQueryResult = Apollo.QueryResult<PostsQueryData, PostsQueryVariables>;
export const PostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Post"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"post"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function usePostQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PostQueryData, PostQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PostQueryData, PostQueryVariables>(PostDocument, options);
      }
export function usePostLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PostQueryData, PostQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PostQueryData, PostQueryVariables>(PostDocument, options);
        }
// @ts-ignore
export function usePostSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<PostQueryData, PostQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostQueryData, PostQueryVariables>;
export function usePostSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostQueryData, PostQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostQueryData | undefined, PostQueryVariables>;
export function usePostSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostQueryData, PostQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<PostQueryData, PostQueryVariables>(PostDocument, options);
        }
export type PostQueryHookResult = ReturnType<typeof usePostQuery>;
export type PostLazyQueryHookResult = ReturnType<typeof usePostLazyQuery>;
export type PostSuspenseQueryHookResult = ReturnType<typeof usePostSuspenseQuery>;
export type PostQueryResult = Apollo.QueryResult<PostQueryData, PostQueryVariables>;
export const PostVersionsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PostVersions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"postId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"postVersions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"postId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"postId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostVersion"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostVersion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostVersion"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]} as unknown as DocumentNode;
export function usePostVersionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<PostVersionsQueryData, PostVersionsQueryVariables> & ({ variables: PostVersionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PostVersionsQueryData, PostVersionsQueryVariables>(PostVersionsDocument, options);
      }
export function usePostVersionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PostVersionsQueryData, PostVersionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PostVersionsQueryData, PostVersionsQueryVariables>(PostVersionsDocument, options);
        }
// @ts-ignore
export function usePostVersionsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<PostVersionsQueryData, PostVersionsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostVersionsQueryData, PostVersionsQueryVariables>;
export function usePostVersionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostVersionsQueryData, PostVersionsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PostVersionsQueryData | undefined, PostVersionsQueryVariables>;
export function usePostVersionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PostVersionsQueryData, PostVersionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<PostVersionsQueryData, PostVersionsQueryVariables>(PostVersionsDocument, options);
        }
export type PostVersionsQueryHookResult = ReturnType<typeof usePostVersionsQuery>;
export type PostVersionsLazyQueryHookResult = ReturnType<typeof usePostVersionsLazyQuery>;
export type PostVersionsSuspenseQueryHookResult = ReturnType<typeof usePostVersionsSuspenseQuery>;
export type PostVersionsQueryResult = Apollo.QueryResult<PostVersionsQueryData, PostVersionsQueryVariables>;
export const SearchPostsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"took"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function useSearchPostsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SearchPostsQueryData, SearchPostsQueryVariables> & ({ variables: SearchPostsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchPostsQueryData, SearchPostsQueryVariables>(SearchPostsDocument, options);
      }
export function useSearchPostsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchPostsQueryData, SearchPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchPostsQueryData, SearchPostsQueryVariables>(SearchPostsDocument, options);
        }
// @ts-ignore
export function useSearchPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<SearchPostsQueryData, SearchPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchPostsQueryData, SearchPostsQueryVariables>;
export function useSearchPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchPostsQueryData, SearchPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchPostsQueryData | undefined, SearchPostsQueryVariables>;
export function useSearchPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchPostsQueryData, SearchPostsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<SearchPostsQueryData, SearchPostsQueryVariables>(SearchPostsDocument, options);
        }
export type SearchPostsQueryHookResult = ReturnType<typeof useSearchPostsQuery>;
export type SearchPostsLazyQueryHookResult = ReturnType<typeof useSearchPostsLazyQuery>;
export type SearchPostsSuspenseQueryHookResult = ReturnType<typeof useSearchPostsSuspenseQuery>;
export type SearchPostsQueryResult = Apollo.QueryResult<SearchPostsQueryData, SearchPostsQueryVariables>;
export const PopularPostsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PopularPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPopularPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function usePopularPostsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PopularPostsQueryData, PopularPostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PopularPostsQueryData, PopularPostsQueryVariables>(PopularPostsDocument, options);
      }
export function usePopularPostsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PopularPostsQueryData, PopularPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PopularPostsQueryData, PopularPostsQueryVariables>(PopularPostsDocument, options);
        }
// @ts-ignore
export function usePopularPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<PopularPostsQueryData, PopularPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PopularPostsQueryData, PopularPostsQueryVariables>;
export function usePopularPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PopularPostsQueryData, PopularPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<PopularPostsQueryData | undefined, PopularPostsQueryVariables>;
export function usePopularPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<PopularPostsQueryData, PopularPostsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<PopularPostsQueryData, PopularPostsQueryVariables>(PopularPostsDocument, options);
        }
export type PopularPostsQueryHookResult = ReturnType<typeof usePopularPostsQuery>;
export type PopularPostsLazyQueryHookResult = ReturnType<typeof usePopularPostsLazyQuery>;
export type PopularPostsSuspenseQueryHookResult = ReturnType<typeof usePopularPostsSuspenseQuery>;
export type PopularPostsQueryResult = Apollo.QueryResult<PopularPostsQueryData, PopularPostsQueryVariables>;
export const RecentPostsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RecentPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getRecentPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function useRecentPostsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RecentPostsQueryData, RecentPostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RecentPostsQueryData, RecentPostsQueryVariables>(RecentPostsDocument, options);
      }
export function useRecentPostsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RecentPostsQueryData, RecentPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RecentPostsQueryData, RecentPostsQueryVariables>(RecentPostsDocument, options);
        }
// @ts-ignore
export function useRecentPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<RecentPostsQueryData, RecentPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<RecentPostsQueryData, RecentPostsQueryVariables>;
export function useRecentPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<RecentPostsQueryData, RecentPostsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<RecentPostsQueryData | undefined, RecentPostsQueryVariables>;
export function useRecentPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<RecentPostsQueryData, RecentPostsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<RecentPostsQueryData, RecentPostsQueryVariables>(RecentPostsDocument, options);
        }
export type RecentPostsQueryHookResult = ReturnType<typeof useRecentPostsQuery>;
export type RecentPostsLazyQueryHookResult = ReturnType<typeof useRecentPostsLazyQuery>;
export type RecentPostsSuspenseQueryHookResult = ReturnType<typeof useRecentPostsSuspenseQuery>;
export type RecentPostsQueryResult = Apollo.QueryResult<RecentPostsQueryData, RecentPostsQueryVariables>;
export const TrendingTagsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrendingTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTrendingTags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}]}]}}]} as unknown as DocumentNode;
export function useTrendingTagsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TrendingTagsQueryData, TrendingTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TrendingTagsQueryData, TrendingTagsQueryVariables>(TrendingTagsDocument, options);
      }
export function useTrendingTagsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TrendingTagsQueryData, TrendingTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TrendingTagsQueryData, TrendingTagsQueryVariables>(TrendingTagsDocument, options);
        }
// @ts-ignore
export function useTrendingTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<TrendingTagsQueryData, TrendingTagsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<TrendingTagsQueryData, TrendingTagsQueryVariables>;
export function useTrendingTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<TrendingTagsQueryData, TrendingTagsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<TrendingTagsQueryData | undefined, TrendingTagsQueryVariables>;
export function useTrendingTagsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<TrendingTagsQueryData, TrendingTagsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<TrendingTagsQueryData, TrendingTagsQueryVariables>(TrendingTagsDocument, options);
        }
export type TrendingTagsQueryHookResult = ReturnType<typeof useTrendingTagsQuery>;
export type TrendingTagsLazyQueryHookResult = ReturnType<typeof useTrendingTagsLazyQuery>;
export type TrendingTagsSuspenseQueryHookResult = ReturnType<typeof useTrendingTagsSuspenseQuery>;
export type TrendingTagsQueryResult = Apollo.QueryResult<TrendingTagsQueryData, TrendingTagsQueryVariables>;
export const CreatePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type CreatePostMutationFn = Apollo.MutationFunction<CreatePostMutationData, CreatePostMutationVariables>;
export function useCreatePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreatePostMutationData, CreatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreatePostMutationData, CreatePostMutationVariables>(CreatePostDocument, options);
      }
export type CreatePostMutationHookResult = ReturnType<typeof useCreatePostMutation>;
export type CreatePostMutationResult = Apollo.MutationResult<CreatePostMutationData>;
export type CreatePostMutationOptions = Apollo.BaseMutationOptions<CreatePostMutationData, CreatePostMutationVariables>;
export const UpdatePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UpdatePostMutationFn = Apollo.MutationFunction<UpdatePostMutationData, UpdatePostMutationVariables>;
export function useUpdatePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdatePostMutationData, UpdatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdatePostMutationData, UpdatePostMutationVariables>(UpdatePostDocument, options);
      }
export type UpdatePostMutationHookResult = ReturnType<typeof useUpdatePostMutation>;
export type UpdatePostMutationResult = Apollo.MutationResult<UpdatePostMutationData>;
export type UpdatePostMutationOptions = Apollo.BaseMutationOptions<UpdatePostMutationData, UpdatePostMutationVariables>;
export const DeletePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type DeletePostMutationFn = Apollo.MutationFunction<DeletePostMutationData, DeletePostMutationVariables>;
export function useDeletePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeletePostMutationData, DeletePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeletePostMutationData, DeletePostMutationVariables>(DeletePostDocument, options);
      }
export type DeletePostMutationHookResult = ReturnType<typeof useDeletePostMutation>;
export type DeletePostMutationResult = Apollo.MutationResult<DeletePostMutationData>;
export type DeletePostMutationOptions = Apollo.BaseMutationOptions<DeletePostMutationData, DeletePostMutationVariables>;
export const PublishPostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type PublishPostMutationFn = Apollo.MutationFunction<PublishPostMutationData, PublishPostMutationVariables>;
export function usePublishPostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PublishPostMutationData, PublishPostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PublishPostMutationData, PublishPostMutationVariables>(PublishPostDocument, options);
      }
export type PublishPostMutationHookResult = ReturnType<typeof usePublishPostMutation>;
export type PublishPostMutationResult = Apollo.MutationResult<PublishPostMutationData>;
export type PublishPostMutationOptions = Apollo.BaseMutationOptions<PublishPostMutationData, PublishPostMutationVariables>;
export const ArchivePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchivePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archivePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type ArchivePostMutationFn = Apollo.MutationFunction<ArchivePostMutationData, ArchivePostMutationVariables>;
export function useArchivePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ArchivePostMutationData, ArchivePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ArchivePostMutationData, ArchivePostMutationVariables>(ArchivePostDocument, options);
      }
export type ArchivePostMutationHookResult = ReturnType<typeof useArchivePostMutation>;
export type ArchivePostMutationResult = Apollo.MutationResult<ArchivePostMutationData>;
export type ArchivePostMutationOptions = Apollo.BaseMutationOptions<ArchivePostMutationData, ArchivePostMutationVariables>;
export const LikePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LikePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type LikePostMutationFn = Apollo.MutationFunction<LikePostMutationData, LikePostMutationVariables>;
export function useLikePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LikePostMutationData, LikePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LikePostMutationData, LikePostMutationVariables>(LikePostDocument, options);
      }
export type LikePostMutationHookResult = ReturnType<typeof useLikePostMutation>;
export type LikePostMutationResult = Apollo.MutationResult<LikePostMutationData>;
export type LikePostMutationOptions = Apollo.BaseMutationOptions<LikePostMutationData, LikePostMutationVariables>;
export const UnlikePostDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlikePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlikePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accessLevel"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastEditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"notionPageId"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostInfo"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserInfo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"versions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"versionNum"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"changeLog"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export type UnlikePostMutationFn = Apollo.MutationFunction<UnlikePostMutationData, UnlikePostMutationVariables>;
export function useUnlikePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UnlikePostMutationData, UnlikePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UnlikePostMutationData, UnlikePostMutationVariables>(UnlikePostDocument, options);
      }
export type UnlikePostMutationHookResult = ReturnType<typeof useUnlikePostMutation>;
export type UnlikePostMutationResult = Apollo.MutationResult<UnlikePostMutationData>;
export type UnlikePostMutationOptions = Apollo.BaseMutationOptions<UnlikePostMutationData, UnlikePostMutationVariables>;
export const CommentsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Comments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"blogPostId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CommentFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CommentSortInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"blogPostId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"blogPostId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"blogPost"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode;
export function useCommentsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CommentsQueryData, CommentsQueryVariables> & ({ variables: CommentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CommentsQueryData, CommentsQueryVariables>(CommentsDocument, options);
      }
export function useCommentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CommentsQueryData, CommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CommentsQueryData, CommentsQueryVariables>(CommentsDocument, options);
        }
// @ts-ignore
export function useCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<CommentsQueryData, CommentsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<CommentsQueryData, CommentsQueryVariables>;
export function useCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<CommentsQueryData, CommentsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<CommentsQueryData | undefined, CommentsQueryVariables>;
export function useCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<CommentsQueryData, CommentsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<CommentsQueryData, CommentsQueryVariables>(CommentsDocument, options);
        }
export type CommentsQueryHookResult = ReturnType<typeof useCommentsQuery>;
export type CommentsLazyQueryHookResult = ReturnType<typeof useCommentsLazyQuery>;
export type CommentsSuspenseQueryHookResult = ReturnType<typeof useCommentsSuspenseQuery>;
export type CommentsQueryResult = Apollo.QueryResult<CommentsQueryData, CommentsQueryVariables>;
export const CommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Comment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"blogPost"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode;
export function useCommentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CommentQueryData, CommentQueryVariables> & ({ variables: CommentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CommentQueryData, CommentQueryVariables>(CommentDocument, options);
      }
export function useCommentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CommentQueryData, CommentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CommentQueryData, CommentQueryVariables>(CommentDocument, options);
        }
// @ts-ignore
export function useCommentSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<CommentQueryData, CommentQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<CommentQueryData, CommentQueryVariables>;
export function useCommentSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<CommentQueryData, CommentQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<CommentQueryData | undefined, CommentQueryVariables>;
export function useCommentSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<CommentQueryData, CommentQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<CommentQueryData, CommentQueryVariables>(CommentDocument, options);
        }
export type CommentQueryHookResult = ReturnType<typeof useCommentQuery>;
export type CommentLazyQueryHookResult = ReturnType<typeof useCommentLazyQuery>;
export type CommentSuspenseQueryHookResult = ReturnType<typeof useCommentSuspenseQuery>;
export type CommentQueryResult = Apollo.QueryResult<CommentQueryData, CommentQueryVariables>;
export const CreateCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type CreateCommentMutationFn = Apollo.MutationFunction<CreateCommentMutationData, CreateCommentMutationVariables>;
export function useCreateCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCommentMutationData, CreateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCommentMutationData, CreateCommentMutationVariables>(CreateCommentDocument, options);
      }
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>;
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutationData>;
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<CreateCommentMutationData, CreateCommentMutationVariables>;
export const UpdateCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type UpdateCommentMutationFn = Apollo.MutationFunction<UpdateCommentMutationData, UpdateCommentMutationVariables>;
export function useUpdateCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateCommentMutationData, UpdateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateCommentMutationData, UpdateCommentMutationVariables>(UpdateCommentDocument, options);
      }
export type UpdateCommentMutationHookResult = ReturnType<typeof useUpdateCommentMutation>;
export type UpdateCommentMutationResult = Apollo.MutationResult<UpdateCommentMutationData>;
export type UpdateCommentMutationOptions = Apollo.BaseMutationOptions<UpdateCommentMutationData, UpdateCommentMutationVariables>;
export const DeleteCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GeneralResponseInfo"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GeneralResponseInfo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GeneralResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode;
export type DeleteCommentMutationFn = Apollo.MutationFunction<DeleteCommentMutationData, DeleteCommentMutationVariables>;
export function useDeleteCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteCommentMutationData, DeleteCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteCommentMutationData, DeleteCommentMutationVariables>(DeleteCommentDocument, options);
      }
export type DeleteCommentMutationHookResult = ReturnType<typeof useDeleteCommentMutation>;
export type DeleteCommentMutationResult = Apollo.MutationResult<DeleteCommentMutationData>;
export type DeleteCommentMutationOptions = Apollo.BaseMutationOptions<DeleteCommentMutationData, DeleteCommentMutationVariables>;
export const LikeCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LikeComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likeComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type LikeCommentMutationFn = Apollo.MutationFunction<LikeCommentMutationData, LikeCommentMutationVariables>;
export function useLikeCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LikeCommentMutationData, LikeCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LikeCommentMutationData, LikeCommentMutationVariables>(LikeCommentDocument, options);
      }
export type LikeCommentMutationHookResult = ReturnType<typeof useLikeCommentMutation>;
export type LikeCommentMutationResult = Apollo.MutationResult<LikeCommentMutationData>;
export type LikeCommentMutationOptions = Apollo.BaseMutationOptions<LikeCommentMutationData, LikeCommentMutationVariables>;
export const UnlikeCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlikeComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlikeComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type UnlikeCommentMutationFn = Apollo.MutationFunction<UnlikeCommentMutationData, UnlikeCommentMutationVariables>;
export function useUnlikeCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UnlikeCommentMutationData, UnlikeCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UnlikeCommentMutationData, UnlikeCommentMutationVariables>(UnlikeCommentDocument, options);
      }
export type UnlikeCommentMutationHookResult = ReturnType<typeof useUnlikeCommentMutation>;
export type UnlikeCommentMutationResult = Apollo.MutationResult<UnlikeCommentMutationData>;
export type UnlikeCommentMutationOptions = Apollo.BaseMutationOptions<UnlikeCommentMutationData, UnlikeCommentMutationVariables>;
export const ReportCommentDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReportComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reportComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"isApproved"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"reportCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode;
export type ReportCommentMutationFn = Apollo.MutationFunction<ReportCommentMutationData, ReportCommentMutationVariables>;
export function useReportCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReportCommentMutationData, ReportCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReportCommentMutationData, ReportCommentMutationVariables>(ReportCommentDocument, options);
      }
export type ReportCommentMutationHookResult = ReturnType<typeof useReportCommentMutation>;
export type ReportCommentMutationResult = Apollo.MutationResult<ReportCommentMutationData>;
export type ReportCommentMutationOptions = Apollo.BaseMutationOptions<ReportCommentMutationData, ReportCommentMutationVariables>;
export const GenerateMechanismTreeDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GenerateMechanismTree"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateMechanismTree"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active_ingredient"}},{"kind":"Field","name":{"kind":"Name","value":"children"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active_ingredient"}},{"kind":"Field","name":{"kind":"Name","value":"children"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active_ingredient"}},{"kind":"Field","name":{"kind":"Name","value":"children"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active_ingredient"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode;
export function useGenerateMechanismTreeQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables> & ({ variables: GenerateMechanismTreeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>(GenerateMechanismTreeDocument, options);
      }
export function useGenerateMechanismTreeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>(GenerateMechanismTreeDocument, options);
        }
// @ts-ignore
export function useGenerateMechanismTreeSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>;
export function useGenerateMechanismTreeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<GenerateMechanismTreeQueryData | undefined, GenerateMechanismTreeQueryVariables>;
export function useGenerateMechanismTreeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>(GenerateMechanismTreeDocument, options);
        }
export type GenerateMechanismTreeQueryHookResult = ReturnType<typeof useGenerateMechanismTreeQuery>;
export type GenerateMechanismTreeLazyQueryHookResult = ReturnType<typeof useGenerateMechanismTreeLazyQuery>;
export type GenerateMechanismTreeSuspenseQueryHookResult = ReturnType<typeof useGenerateMechanismTreeSuspenseQuery>;
export type GenerateMechanismTreeQueryResult = Apollo.QueryResult<GenerateMechanismTreeQueryData, GenerateMechanismTreeQueryVariables>;
export const EnhancedSearchDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EnhancedSearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SearchInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhancedSearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"took"}},{"kind":"Field","name":{"kind":"Name","value":"suggestions"}},{"kind":"Field","name":{"kind":"Name","value":"facets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"authors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"coverImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"isLiked"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BlogPostStats"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BlogPostStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BlogPostStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"viewCount"}},{"kind":"Field","name":{"kind":"Name","value":"likeCount"}},{"kind":"Field","name":{"kind":"Name","value":"shareCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode;
export function useEnhancedSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<EnhancedSearchQueryData, EnhancedSearchQueryVariables> & ({ variables: EnhancedSearchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<EnhancedSearchQueryData, EnhancedSearchQueryVariables>(EnhancedSearchDocument, options);
      }
export function useEnhancedSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<EnhancedSearchQueryData, EnhancedSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<EnhancedSearchQueryData, EnhancedSearchQueryVariables>(EnhancedSearchDocument, options);
        }
// @ts-ignore
export function useEnhancedSearchSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<EnhancedSearchQueryData, EnhancedSearchQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<EnhancedSearchQueryData, EnhancedSearchQueryVariables>;
export function useEnhancedSearchSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EnhancedSearchQueryData, EnhancedSearchQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<EnhancedSearchQueryData | undefined, EnhancedSearchQueryVariables>;
export function useEnhancedSearchSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EnhancedSearchQueryData, EnhancedSearchQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<EnhancedSearchQueryData, EnhancedSearchQueryVariables>(EnhancedSearchDocument, options);
        }
export type EnhancedSearchQueryHookResult = ReturnType<typeof useEnhancedSearchQuery>;
export type EnhancedSearchLazyQueryHookResult = ReturnType<typeof useEnhancedSearchLazyQuery>;
export type EnhancedSearchSuspenseQueryHookResult = ReturnType<typeof useEnhancedSearchSuspenseQuery>;
export type EnhancedSearchQueryResult = Apollo.QueryResult<EnhancedSearchQueryData, EnhancedSearchQueryVariables>;
export const SearchSuggestionsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSearchSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}]}]}}]} as unknown as DocumentNode;
export function useSearchSuggestionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables> & ({ variables: SearchSuggestionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>(SearchSuggestionsDocument, options);
      }
export function useSearchSuggestionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>(SearchSuggestionsDocument, options);
        }
// @ts-ignore
export function useSearchSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>;
export function useSearchSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchSuggestionsQueryData | undefined, SearchSuggestionsQueryVariables>;
export function useSearchSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>(SearchSuggestionsDocument, options);
        }
export type SearchSuggestionsQueryHookResult = ReturnType<typeof useSearchSuggestionsQuery>;
export type SearchSuggestionsLazyQueryHookResult = ReturnType<typeof useSearchSuggestionsLazyQuery>;
export type SearchSuggestionsSuspenseQueryHookResult = ReturnType<typeof useSearchSuggestionsSuspenseQuery>;
export type SearchSuggestionsQueryResult = Apollo.QueryResult<SearchSuggestionsQueryData, SearchSuggestionsQueryVariables>;
export const TrendingSearchesDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrendingSearches"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTrendingSearches"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}]}]}}]} as unknown as DocumentNode;
export function useTrendingSearchesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TrendingSearchesQueryData, TrendingSearchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TrendingSearchesQueryData, TrendingSearchesQueryVariables>(TrendingSearchesDocument, options);
      }
export function useTrendingSearchesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TrendingSearchesQueryData, TrendingSearchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TrendingSearchesQueryData, TrendingSearchesQueryVariables>(TrendingSearchesDocument, options);
        }
// @ts-ignore
export function useTrendingSearchesSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<TrendingSearchesQueryData, TrendingSearchesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<TrendingSearchesQueryData, TrendingSearchesQueryVariables>;
export function useTrendingSearchesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<TrendingSearchesQueryData, TrendingSearchesQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<TrendingSearchesQueryData | undefined, TrendingSearchesQueryVariables>;
export function useTrendingSearchesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<TrendingSearchesQueryData, TrendingSearchesQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<TrendingSearchesQueryData, TrendingSearchesQueryVariables>(TrendingSearchesDocument, options);
        }
export type TrendingSearchesQueryHookResult = ReturnType<typeof useTrendingSearchesQuery>;
export type TrendingSearchesLazyQueryHookResult = ReturnType<typeof useTrendingSearchesLazyQuery>;
export type TrendingSearchesSuspenseQueryHookResult = ReturnType<typeof useTrendingSearchesSuspenseQuery>;
export type TrendingSearchesQueryResult = Apollo.QueryResult<TrendingSearchesQueryData, TrendingSearchesQueryVariables>;
export const SearchStatsDocument = /*#__PURE__*/ {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSearchStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalSearches"}},{"kind":"Field","name":{"kind":"Name","value":"popularQueries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"query"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"lastSearched"}}]}},{"kind":"Field","name":{"kind":"Name","value":"searchTrends"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"searchCount"}},{"kind":"Field","name":{"kind":"Name","value":"topQueries"}}]}}]}}]}}]} as unknown as DocumentNode;
export function useSearchStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchStatsQueryData, SearchStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchStatsQueryData, SearchStatsQueryVariables>(SearchStatsDocument, options);
      }
export function useSearchStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchStatsQueryData, SearchStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchStatsQueryData, SearchStatsQueryVariables>(SearchStatsDocument, options);
        }
// @ts-ignore
export function useSearchStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<SearchStatsQueryData, SearchStatsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchStatsQueryData, SearchStatsQueryVariables>;
export function useSearchStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchStatsQueryData, SearchStatsQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<SearchStatsQueryData | undefined, SearchStatsQueryVariables>;
export function useSearchStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<SearchStatsQueryData, SearchStatsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<SearchStatsQueryData, SearchStatsQueryVariables>(SearchStatsDocument, options);
        }
export type SearchStatsQueryHookResult = ReturnType<typeof useSearchStatsQuery>;
export type SearchStatsLazyQueryHookResult = ReturnType<typeof useSearchStatsLazyQuery>;
export type SearchStatsSuspenseQueryHookResult = ReturnType<typeof useSearchStatsSuspenseQuery>;
export type SearchStatsQueryResult = Apollo.QueryResult<SearchStatsQueryData, SearchStatsQueryVariables>;