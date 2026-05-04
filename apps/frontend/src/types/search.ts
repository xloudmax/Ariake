// 搜索相关类型定义

// 热门搜索词类型
export interface TrendingSearch {
  term: string;
  count: number;
}

// 搜索趋势类型
export interface SearchTrend {
  date: string;
  searchCount: number;
  topQueries: string[];
}

// 搜索统计类型
export interface SearchStats {
  totalSearches: number;
  popularQueries: Array<{
    query: string;
    count: number;
    lastSearched: string;
  }>;
  searchTrends: SearchTrend[];
}

// 搜索过滤条件
export interface SearchFilters {
  authorId?: string;
  tags?: string[];
  categories?: string[];
  dateFrom?: string;
  dateTo?: string;
  minViews?: number;
  minLikes?: number;
}

// 搜索排序选项
export type SearchSortBy = 'RELEVANCE' | 'CREATED_AT' | 'UPDATED_AT' | 'VIEW_COUNT' | 'LIKE_COUNT'

// 搜索输入
export interface SearchInput {
  query: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  sortBy?: SearchSortBy;
}

import { BlogPost, User } from '@/generated/graphql'

// 搜索结果
export interface EnhancedSearchResult {
  posts: Array<Pick<BlogPost,
    'id' | 'title' | 'slug' | 'excerpt' | 'tags' | 'categories' | 'coverImageUrl' |
    'status' | 'publishedAt' | 'createdAt' | 'isLiked' | 'stats'
  > & {
    author: Pick<User, 'id' | 'username' | 'role'> & { avatar?: string | null };
  }>;
  total: number;
  took: string;
  suggestions?: string[];
  facets: {
    tags: Array<{ value: string; count: number }>;
    categories: Array<{ value: string; count: number }>;
    authors: Array<{ value: string; count: number }>;
  };
}

export interface UseTrendingSearchesReturn {
  trendingSearches: string[];
  loading: boolean;
  error?: Error;
}

export interface UseSearchStatsReturn {
  searchStats: SearchStats | null;
  loading: boolean;
  error?: Error;
}

export interface UseEnhancedSearchReturn {
  search: (input: SearchInput) => Promise<void>;
  results: EnhancedSearchResult | null;
  loading: boolean;
  error?: Error;
  fetchMore: unknown;
}
