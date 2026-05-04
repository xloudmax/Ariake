import { useCallback, useState, useEffect } from 'react'
import {
  useTrendingSearches,
  useSearchStats,
  useEnhancedSearch
} from '../api/graphql/search'
import type {
  UseTrendingSearchesReturn,
  UseSearchStatsReturn,
  UseEnhancedSearchReturn,
  SearchStats as SearchStatsType,
  SearchInput
} from '../types'

interface StaticTag { name: string; count: number; }
interface StaticPost {
  title?: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  stats?: { viewCount?: number; likeCount?: number };
}

interface StaticSearchResult {
  total: number;
  took: string;
  posts: StaticPost[];
  suggestions: string[];
  facets: null;
}

interface UseTrendingSearchesOptions {
  enabled?: boolean;
}

const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'

// 热门搜索词hook
export const useTrendingSearchesHook = (limit: number = 10, options?: UseTrendingSearchesOptions): UseTrendingSearchesReturn => {
  const enabled = options?.enabled ?? true
  const { trendingSearches, loading, error } = useTrendingSearches(limit, enabled)

  const [staticTrending, setStaticTrending] = useState<string[]>([])
  const [staticLoading, setStaticLoading] = useState(false)

  useEffect(() => {
    if (isStatic && enabled) {
      setStaticLoading(true)
      fetch('/static/dashboard.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.tags) {
            const sortedTags = (data.tags as StaticTag[]).sort((a, b) => b.count - a.count).slice(0, limit)
            setStaticTrending(sortedTags.map((t) => t.name))
          }
        })
        .catch(() => { /* silently ignore static fetch errors */ })
        .finally(() => setStaticLoading(false))
    }
  }, [enabled, limit])

  return {
    trendingSearches: isStatic ? staticTrending : trendingSearches,
    loading: isStatic ? (enabled ? staticLoading : false) : loading,
    error: isStatic ? undefined : error,
  }
}

// 搜索统计hook
export const useSearchStatsHook = (): UseSearchStatsReturn => {
  const { searchStats, loading, error } = useSearchStats()

  return {
    searchStats: searchStats as SearchStatsType | null,
    loading,
    error,
  }
}

// 增强的搜索hook
export const useEnhancedSearchHook = (): UseEnhancedSearchReturn => {
  const { search: graphqlSearch, results: graphqlResults, loading: graphqlLoading, error: graphqlError, fetchMore } = useEnhancedSearch()

  const [staticResults, setStaticResults] = useState<StaticSearchResult | null>(null)
  const [staticLoading, setStaticLoading] = useState(false)
  const [staticError, setStaticError] = useState<Error | null>(null)

  const performSearch = useCallback(async (input: SearchInput) => {
    if (isStatic) {
      setStaticLoading(true)
      setStaticError(null)
      try {
        const query = (input.query || '').toLowerCase()

        const res = await fetch('/static/posts.json')
        if (!res.ok) throw new Error('Failed to fetch static posts')
        const posts = await res.json()

        let filtered: StaticPost[] = posts as StaticPost[]
        if (query) {
          filtered = filtered.filter((p) =>
            (p.title || '').toLowerCase().includes(query) ||
            (p.excerpt || '').toLowerCase().includes(query) ||
            (p.content || '').toLowerCase().includes(query) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(query))
          )
        }

        if (input.sortBy === 'CREATED_AT') {
          filtered.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        } else if (input.sortBy === 'UPDATED_AT') {
          filtered.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        } else if (input.sortBy === 'VIEW_COUNT') {
          filtered.sort((a, b) => (b.stats?.viewCount ?? 0) - (a.stats?.viewCount ?? 0))
        } else if (input.sortBy === 'LIKE_COUNT') {
          filtered.sort((a, b) => (b.stats?.likeCount ?? 0) - (a.stats?.likeCount ?? 0))
        }

        const total = filtered.length
        const offset = input.offset || 0
        const limit = input.limit || 10
        const paginated = filtered.slice(offset, offset + limit)

        setStaticResults({
          total,
          took: '0.01s',
          posts: paginated,
          suggestions: [],
          facets: null,
        })
      } catch (err) {
        setStaticError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setStaticLoading(false)
      }
      return
    }

    try {
      await graphqlSearch(input)
    } catch {
      // 错误已经在 GraphQL 层处理
    }
  }, [graphqlSearch])

  return {
    search: performSearch,
    results: isStatic ? (staticResults as unknown as import('../types').EnhancedSearchResult | null) : (graphqlResults || null),
    loading: isStatic ? staticLoading : graphqlLoading,
    error: isStatic ? staticError ?? undefined : graphqlError,
    fetchMore,
  }
}
