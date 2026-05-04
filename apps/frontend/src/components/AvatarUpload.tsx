import { useState } from 'react'
import { Upload, Avatar, message, Spin } from 'antd'
import { LiquidButton } from './LiquidButton'
import { UploadOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons'
import { useImageUpload } from '@/hooks/useImageUpload'

export interface AvatarUploadProps {
  /** 当前头像URL */
  value?: string;
  /** 头像变化回调 */
  onChange?: (url: string) => void;
  /** 头像大小 */
  size?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示上传按钮 */
  showUploadButton?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

export default function AvatarUpload ({
  value,
  onChange,
  size = 100,
  disabled = false,
  showUploadButton = true,
  className,
}: AvatarUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(value)

  const { uploadImage, uploading } = useImageUpload({
    onSuccess: (url) => {
      setImageUrl(url)
      onChange?.(url)
    },
    maxSize: 5, // 5MB for avatars
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  })

  // 处理文件选择
  const handleChange = (file: File) => {
    uploadImage(file)
  }

  // 上传前的验证
  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    if (!isValidType) {
      message.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片!')
      return false
    }

    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB!')
      return false
    }

    handleChange(file)
    return false // 阻止默认上传行为
  }

  const uploadButton = (
    <LiquidButton
      variant='ghost'
      disabled={disabled || uploading}
      style={{ width: size, height: size }}
      className='flex flex-col items-center justify-center border-dashed border-gray-300 dark:border-gray-500 rounded-full'
      onClick={() => {}} // Upload triggers it via wrapper
    >
      <div className='flex flex-col items-center'>
        {uploading ? <LoadingOutlined /> : <UploadOutlined />}
        <div className='text-xs mt-1'>
          {uploading ? '上传中...' : '上传头像'}
        </div>
      </div>
    </LiquidButton>
  )

  return (
    <div className={`flex flex-col items-center gap-4 ${className || ''}`}>
      {/* 头像预览 */}
      <div className='relative'>
        <Avatar
          size={size}
          src={imageUrl}
          icon={!imageUrl && <UserOutlined />}
          className='border-2 border-gray-200 dark:border-gray-600'
        />
        {uploading && (
          <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full'>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: 'white' }} />} />
          </div>
        )}
      </div>

      {/* 上传按钮 */}
      {showUploadButton && (
        <Upload
          accept='image/*'
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={disabled || uploading}
        >
          {uploadButton}
        </Upload>
      )}

      {/* 隐藏的文件输入，可以通过 ref 触发 */}
      <Upload
        accept='image/*'
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      >
        {/* 用于程序化触发上传 */}
      </Upload>
    </div>
  )
}
