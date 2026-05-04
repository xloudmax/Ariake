import { useState } from 'react'
import { Upload, Image, List, Card, message, Modal } from 'antd'
import { LiquidButton } from './LiquidButton'
import {
  InboxOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { useImageUpload } from '@/hooks/useImageUpload'

const { Dragger } = Upload

export interface UploadedImage {
  url: string;
  filename: string;
  size: number;
  deleteUrl?: string;
  uploadTime: Date;
}

export interface ImageUploadProps {
  /** 已上传的图片列表 */
  value?: UploadedImage[];
  /** 图片列表变化回调 */
  onChange?: (images: UploadedImage[]) => void;
  /** 是否支持多图上传 */
  multiple?: boolean;
  /** 最大上传数量 */
  maxCount?: number;
  /** 是否显示为拖拽上传 */
  dragger?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 上传按钮文字 */
  buttonText?: string;
  /** 拖拽区域提示文字 */
  dragText?: string;
}

export default function ImageUpload ({
  value = [],
  onChange,
  multiple = true,
  maxCount = 10,
  dragger = false,
  disabled = false,
  className,
  buttonText = '上传图片',
  dragText = '点击或拖拽图片到此区域上传',
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(value)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  const { uploadImage, uploading } = useImageUpload({
    onSuccess: (url, response) => {
      const newImage: UploadedImage = {
        url,
        filename: response.filename,
        size: response.size,
        deleteUrl: response.deleteUrl || undefined,
        uploadTime: new Date(),
      }

      const updatedImages = multiple ? [...images, newImage] : [newImage]
      setImages(updatedImages)
      onChange?.(updatedImages)
    },
  })

  // 处理文件选择
  const handleChange = (fileList: File[]) => {
    for (const file of fileList) {
      if (!multiple && images.length >= 1) {
        message.warning('只能上传一张图片')
        break
      }
      if (images.length >= maxCount) {
        message.warning(`最多只能上传 ${maxCount} 张图片`)
        break
      }
      uploadImage(file)
    }
  }

  // 上传前的验证
  const beforeUpload = (file: File, fileList: File[]) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    if (!isValidType) {
      message.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片!')
      return false
    }

    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB!')
      return false
    }

    if (multiple) {
      handleChange(fileList)
    } else {
      handleChange([file])
    }
    return false // 阻止默认上传行为
  }

  // 删除图片
  const handleDelete = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)
    onChange?.(updatedImages)
    message.success('图片已删除')
  }

  // 预览图片
  const handlePreview = (image: UploadedImage) => {
    setPreviewImage(image.url)
    setPreviewTitle(image.filename)
    setPreviewVisible(true)
  }

  // 复制图片链接
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      message.success('图片链接已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadProps = {
    accept: 'image/*',
    multiple,
    showUploadList: false,
    beforeUpload,
    disabled: disabled || uploading || (!multiple && images.length >= 1) || images.length >= maxCount,
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* 上传区域 */}
      <div>
        {dragger
          ? (
            <Dragger {...uploadProps}>
              <p className='ant-upload-drag-icon'>
                {uploading ? <LoadingOutlined /> : <InboxOutlined />}
              </p>
              <p className='ant-upload-text'>
                {uploading ? '上传中...' : dragText}
              </p>
              <p className='ant-upload-hint'>
                支持 JPG、PNG、GIF、WEBP 格式，单个文件不超过 10MB
              </p>
            </Dragger>
            )
          : (
            <Upload {...uploadProps}>
              <LiquidButton
                disabled={uploadProps.disabled}
                loading={uploading}
                variant='secondary'
                className='w-full sm:w-auto'
              >
                {uploading ? '上传中...' : buttonText}
              </LiquidButton>
            </Upload>
            )}

        {!multiple && images.length >= 1 && (
          <div className='text-xs text-gray-500 mt-1'>
            单图模式下只能上传一张图片
          </div>
        )}

        {images.length >= maxCount && (
          <div className='text-xs text-orange-500 mt-1'>
            已达到最大上传数量限制 ({maxCount} 张)
          </div>
        )}
      </div>

      {/* 图片列表 */}
      {images.length > 0 && (
        <div>
          <h4 className='text-sm font-medium mb-2'>已上传图片 ({images.length})</h4>
          <List
            grid={{ gutter: 16, column: 4 }}
            dataSource={images}
            renderItem={(image, index) => (
              <List.Item>
                <Card
                  size='small'
                  cover={
                    <Image
                      src={image.url}
                      alt={image.filename}
                      height={120}
                      style={{ objectFit: 'cover' }}
                      preview={false}
                    />
                  }
                  actions={[
                    <EyeOutlined
                      key='preview'
                      onClick={() => handlePreview(image)}
                      title='预览'
                    />,
                    <CopyOutlined
                      key='copy'
                      onClick={() => handleCopyUrl(image.url)}
                      title='复制链接'
                    />,
                    <DeleteOutlined
                      key='delete'
                      onClick={() => handleDelete(index)}
                      title='删除'
                      style={{ color: '#ff4d4f' }}
                    />,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div className='truncate text-xs' title={image.filename}>
                        {image.filename}
                      </div>
                    }
                    description={
                      <div className='text-xs text-gray-500'>
                        {formatFileSize(image.size)}
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 图片预览弹窗 */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <Image
          src={previewImage}
          alt={previewTitle}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  )
}
