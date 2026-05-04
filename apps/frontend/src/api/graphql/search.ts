import { useCallback } from 'react'
import type {
  UseTrendingSearchesReturn,
  UseSearchStatsReturn,
  SearchStats as TypedSearchStats,
  SearchInput
} from '@/types'

// Import generated operations
import {
  useSearchPostsLazyQuery,
  useEnhancedSearchLazyQuery,
  useTrendingSearchesQuery,
  useSearchStatsQuery,
  SearchPostsDocument,
  EnhancedSearchDocument,
  TrendingSearchesDocument,
  SearchStatsDocument
} from '@/generated/graphql'

// Export the generated documents for backward compatibility
export const BASIC_SEARCH_QUERY = SearchPostsDocument
export const ENHANCED_SEARCH_QUERY = EnhancedSearchDocument
export const TRENDING_SEARCHES_QUERY = TrendingSearchesDocument
export const SEARCH_STATS_QUERY = SearchStatsDocument

// 热门搜索词 Hook
export const useTrendingSearches = (limit: number = 10, enabled: boolean = true): UseTrendingSearchesReturn => {
  const { data, loading, error } = useTrendingSearchesQuery({
    variables: { limit },
    skip: !enabled,
    errorPolicy: 'all',
    context: { silentError: true },
  })

  return {
    trendingSearches: data?.getTrendingSearches as string[] || [],
    loading: enabled ? loading : false,
    error,
  }
}

// 搜索统计信息 Hook
export const useSearchStats = (): UseSearchStatsReturn => {
  const { data, loading, error } = useSearchStatsQuery({
    errorPolicy: 'all',
    context: { silentError: true },
  })

  return {
    searchStats: data?.getSearchStats as TypedSearchStats | null,
    loading,
    error,
  }
}

// 基础搜索 Hook
export const useBasicSearch = () => {
  const [searchPosts, { data, loading, error, fetchMore }] = useSearchPostsLazyQuery({
    errorPolicy: 'all',
  })

  const search = useCallback((params: { query: string; limit?: number; offset?: number }) => {
    return searchPosts({
      variables: {
        query: params.query,
        limit: params.limit || 10,
        offset: params.offset || 0
      },
      context: { silentError: true },
    })
  }, [searchPosts])

  return {
    search,
    results: data?.searchPosts,
    loading,
    error,
    fetchMore,
  }
}

// 增强搜索 Hook - 使用真正的enhancedSearch
export const useEnhancedSearch = () => {
  const [enhancedSearch, { data, loading, error, fetchMore }] = useEnhancedSearchLazyQuery({
    errorPolicy: 'all',
  })

  const search = useCallback((input: SearchInput) => {
    return enhancedSearch({
      variables: { input },
      context: { silentError: true },
    })
  }, [enhancedSearch])

  return {
    search,
    results: data?.enhancedSearch,
    loading,
    error,
    fetchMore,
  }
}
