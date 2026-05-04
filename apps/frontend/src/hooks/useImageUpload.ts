import { useState } from 'react'
import { message } from 'antd'

export interface UseImageUploadOptions {
  onSuccess?: (url: string, response: ImageUploadResult) => void;
  onError?: (error: Error) => void;
  maxSize?: number; // 最大文件大小（MB）
  acceptedTypes?: string[]; // 支持的文件类型
}

export interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<void>;
  uploading: boolean;
  uploadError: Error | null;
}

export interface ImageUploadResult {
  imageUrl: string;
  deleteUrl?: string;
  filename: string;
  size: number;
}

const DEFAULT_MAX_SIZE = 10 // 10MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function useImageUpload (options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    onSuccess,
    onError,
    maxSize = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  } = options

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<Error | null>(null)

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    if (!acceptedTypes.includes(file.type)) {
      return `不支持的文件类型。支持的类型: ${acceptedTypes.join(', ')}`
    }

    // 检查文件大小
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `文件太大。最大支持 ${maxSize}MB`
    }

    return null
  }

  const uploadImage = async (file: File): Promise<void> => {
    // 验证文件
    const validationError = validateFile(file)
    if (validationError) {
      const error = new Error(validationError)
      setUploadError(error)
      message.error(validationError)
      onError?.(error)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 创建 GraphQL multipart/form-data 请求
      const formData = new FormData()

      // GraphQL query
      const query = `
        mutation UploadImage($file: Upload!) {
          uploadImage(file: $file) {
            imageUrl
            deleteUrl
            filename
            size
          }
        }
      `

      // 创建请求的 operations 和 map
      const operations = {
        query,
        variables: {
          file: null
        }
      }

      const map = {
        0: ['variables.file']
      }

      formData.append('operations', JSON.stringify(operations))
      formData.append('map', JSON.stringify(map))
      formData.append('0', file)

      // 获取 GraphQL endpoint
      const graphqlUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:12345/'}graphql`

      // 获取认证头
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0]?.message || '上传失败')
      }

      if (!result.data?.uploadImage) {
        throw new Error('上传响应格式错误')
      }

      const uploadResult = result.data.uploadImage
      setUploading(false)
      setUploadError(null)
      message.success('图片上传成功')
      onSuccess?.(uploadResult.imageUrl, uploadResult)
    } catch (error) {
      setUploading(false)
      const errorObj = error instanceof Error ? error : new Error('上传失败')
      setUploadError(errorObj)
      message.error(`上传失败: ${errorObj.message}`)
      onError?.(errorObj)
    }
  }

  return {
    uploadImage,
    uploading,
    uploadError,
  }
}

export default useImageUpload
