import { gql } from '@apollo/client'

// 获取所有标签（带使用次数）
export const GET_TAGS = gql`
  query GetTags($limit: Int, $offset: Int, $search: String) {
    getTags(limit: $limit, offset: $offset, search: $search) {
      name
      count
      posts {
        id
        title
        slug
      }
    }
  }
`

// 获取所有分类（带使用次数）
export const GET_CATEGORIES = gql`
  query GetCategories($limit: Int, $offset: Int, $search: String) {
    getCategories(limit: $limit, offset: $offset, search: $search) {
      name
      count
      posts {
        id
        title
        slug
      }
    }
  }
`

// 获取标签和分类统计信息
export const GET_TAG_CATEGORY_STATS = gql`
  query GetTagCategoryStats {
    getTagCategoryStats {
      totalTags
      totalCategories
      tags {
        name
        count
        posts {
          id
          title
        }
      }
      categories {
        name
        count
        posts {
          id
          title
        }
      }
    }
  }
`

// 合并标签
export const MERGE_TAGS = gql`
  mutation MergeTags($sourceTag: String!, $targetTag: String!) {
    mergeTags(sourceTag: $sourceTag, targetTag: $targetTag) {
      success
      message
      code
    }
  }
`

// 合并分类
export const MERGE_CATEGORIES = gql`
  mutation MergeCategories($sourceCategory: String!, $targetCategory: String!) {
    mergeCategories(sourceCategory: $sourceCategory, targetCategory: $targetCategory) {
      success
      message
      code
    }
  }
`

// 批量更新文章标签
export const BATCH_UPDATE_TAGS = gql`
  mutation BatchUpdateTags($input: BatchUpdateTagsInput!) {
    batchUpdateTags(input: $input) {
      success
      message
      code
    }
  }
`

// 批量更新文章分类
export const BATCH_UPDATE_CATEGORIES = gql`
  mutation BatchUpdateCategories($input: BatchUpdateCategoriesInput!) {
    batchUpdateCategories(input: $input) {
      success
      message
      code
    }
  }
`

// 删除未使用的标签
export const DELETE_UNUSED_TAGS = gql`
  mutation DeleteUnusedTags {
    deleteUnusedTags {
      success
      message
      code
    }
  }
`

// 删除未使用的分类
export const DELETE_UNUSED_CATEGORIES = gql`
  mutation DeleteUnusedCategories {
    deleteUnusedCategories {
      success
      message
      code
    }
  }
`
