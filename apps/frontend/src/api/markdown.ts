// src/api/markdown.ts
// Markdown API 兼容层 - 将 GraphQL API 封装为旧版 REST API 接口
// 提供向后兼容的函数，保持原有页面组件的接口不变

// 类型定义

// ==================== 兼容函数 ====================

/**
 * 获取文件内容
 * @param _folder 文件夹名称（已禁用）
 * @param _file 文件名（已禁用）
 * @returns 包含文件内容的Promise对象，格式为 {data: {content: string}}
 */
export const getContent = async (_folder: string, _file: string): Promise<{ data: { content: string } }> => {
  // 简化实现，直接返回空内容
  return {
    data: {
      content: '',
    },
  }
}

/**
 * 上传新文件
 * @param _file File对象（已禁用）
 * @param _folder 目标文件夹（已禁用）
 * @param _title 文件标题（已禁用）
 * @returns Promise<void>
 */
export const uploadFile = async (_file: File, _folder: string, _title: string): Promise<void> => {
  // 简化实现，直接抛出错误
  throw new Error('文件上传功能已禁用')
}

/**
 * 更新文件内容
 * @param _folder 文件夹名称（已禁用）
 * @param _filename 文件名（已禁用）
 * @param _content 新的文件内容（已禁用）
 * @returns Promise<void>
 */
export const updateFile = async (_folder: string, _filename: string, _content: string): Promise<void> => {
  // 简化实现，直接抛出错误
  throw new Error('文件更新功能已禁用')
}

/**
 * 获取文件夹列表
 * @returns 包含文件夹数组的Promise对象，格式为 {data: {folders: string[]}}
 */
export const getFolders = async (): Promise<{ data: { folders: string[] } }> => {
  // 简化实现，返回空数组
  return {
    data: {
      folders: [],
    },
  }
}

// ==================== 默认导出（兼容性） ====================
export default {
  getContent,
  uploadFile,
  updateFile,
  getFolders,
}
