// src/pages/EditorPage.tsx
// 新建或编辑文章的页面
// 使用 lazy 与 Suspense 按需加载编辑器，减少首屏体积
import React, { useEffect, useState, Suspense, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Spin,
  Input,
  Card,
  Typography,
  notification,
  Space,
  Divider,
  Tooltip,
  Tag,
  Row,
  Col,
  Modal
} from 'antd'
import { LiquidButton } from '@/components/LiquidButton'
import {
  LoadingOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { useQuery } from '@apollo/client'
import MarkdownEditor from '@/components/MarkdownEditor'
import { useBlogActions, POST_QUERY } from '@/api/graphql/blog'
import { localFile } from '@/utils/localFile'
import { PageHeader } from '@/components/PageHeader'
import { PageContainer } from '@/components/PageContainer'

const { Title, Text } = Typography

export default function EditorPage () {
  const { file: fileNameFromParams } = useParams<{ file?: string }>()
  const navigate = useNavigate()
  const { createPost, updatePost } = useBlogActions()

  const [markdownContent, setMarkdownContent] = useState('')
  const [newFileTitle, setNewFileTitle] = useState('')
  const [initialContentLoaded, setInitialContentLoaded] = useState(false)

  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [, setIsSaving] = useState(false)

  const isEditMode = !!fileNameFromParams

  // 在编辑模式下加载文章数据
  const { data: postData, loading: loadingPost } = useQuery(POST_QUERY, {
    variables: { slug: fileNameFromParams },
    skip: !isEditMode,
    errorPolicy: 'all',
  })

  const post = postData?.post

  // 根据是否编辑模式加载初始内容
  useEffect(() => {
    if (isEditMode && post) {
      // 编辑模式：加载文章数据
      setNewFileTitle(post.title || '')
      setMarkdownContent(post.content || '')
      setTags(post.tags || [])
      setCoverImage(post.coverImageUrl || '')
      setExcerpt(post.excerpt || '')
      setInitialContentLoaded(true)
    } else if (!isEditMode) {
      // 新建模式：清空表单
      setMarkdownContent('')
      setNewFileTitle('')
      setTags([])
      setCoverImage('')
      setExcerpt('')
      setInitialContentLoaded(true)
    }
  }, [isEditMode, post])

  // 提取文章摘要 (仅当摘要为空时自动填充)
  const extractExcerpt = useCallback((content: string, maxLength: number = 200) => {
    if (!content) return ''
    // 移除Markdown标记
    const plainText = content
      .replace(/[#*`>\-[\]()]/g, '')
      .replace(/!\[.*?]\(.*?\)/g, '')
      .replace(/\[.*?]\(.*?\)/g, '')
      .trim()
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText
  }, [])

  // 当内容变化且摘要为空时，自动生成摘要
  useEffect(() => {
    if (!isEditMode && markdownContent && !excerpt) {
      setExcerpt(extractExcerpt(markdownContent))
    }
  }, [markdownContent, excerpt, isEditMode, extractExcerpt])

  // 添加标签
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // 处理回车添加标签
  const handleTagInputPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSave = async (currentMarkdown: string, status?: 'DRAFT' | 'PUBLISHED') => {
    // 验证必填字段
    if (!newFileTitle.trim()) {
      notification.error({
        message: '错误',
        description: '请输入文章标题',
        duration: 3,
      })
      return
    }

    if (!currentMarkdown.trim()) {
      notification.error({
        message: '错误',
        description: '文章内容不能为空',
        duration: 3,
      })
      return
    }

    setIsSaving(true)

    try {
      if (isEditMode && post) {
        // 编辑模式：更新文章
        const updateData = {
          title: newFileTitle.trim(),
          content: currentMarkdown,
          tags: tags.length > 0 ? tags : [],
          categories: post.categories || [],
          coverImageUrl: coverImage.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          status, // 支持更新状态
          version: post.version // 携带乐观锁版本号
        }

        const result = await updatePost(post.id, updateData)

        if (result) {
          notification.success({
            message: '成功',
            description: status === 'PUBLISHED' ? '文章已发布！' : '文章更新成功！',
            duration: 5,
          })
          navigate(`/post/${result.slug}`)
        }
      } else {
        // 新建模式：创建文章
        const postData = {
          title: newFileTitle.trim(),
          content: currentMarkdown,
          tags: tags.length > 0 ? tags : [],
          categories: [],
          coverImageUrl: coverImage.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          status: status || 'DRAFT' // 默认为草稿，如果指定则使用指定状态
        }

        const result = await createPost(postData)

        if (result) {
          notification.success({
            message: '成功',
            description: '文章保存成功！',
            duration: 5,
          })
          navigate(`/post/${result.slug}`)
        }
      }
    } catch (error) {
      notification.error({
        message: '保存失败',
        description: error instanceof Error ? error.message : '保存文章时发生错误，请重试',
        duration: 5,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // --- 本地文件处理逻辑 ---

  const handleImportLocal = async () => {
    const result = await localFile.importMarkdown()
    if (result) {
      setNewFileTitle(result.title)
      setMarkdownContent(result.content)
      notification.success({
        message: '导入成功',
        description: `已从本地加载: ${result.title}`,
      })
    }
  }

  const handleExportLocal = async () => {
    if (!markdownContent.trim()) {
      notification.warning({
        message: '警告',
        description: '没有内容可导出',
      })
      return
    }
    const success = await localFile.exportMarkdown(newFileTitle, markdownContent)
    if (success) {
      notification.success({
        message: '导出成功',
        description: '文章已保存到本地',
      })
    }
  }

  // --- ---

  // 关闭预览
  const closePreview = () => {
    setIsPreviewVisible(false)
  }

  if (loadingPost && isEditMode && !initialContentLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={isEditMode ? '编辑文章' : '创建文章'}
        icon={<FileTextOutlined />}
      />

      <Card className='mb-5 optimized-card'>
        <Title level={4} className='text-heading-3'>文章信息</Title>
        <Divider className='my-3' />
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div className='space-y-4'>
              <div>
                <Text className='optimized-label'>
                  文章标题 <span className='text-red-500'>*</span>
                  {isEditMode && <Text type='secondary' style={{ fontSize: '12px', marginLeft: '8px' }}>(编辑模式下标题固定)</Text>}
                </Text>
                <Input
                  placeholder='请输入文章标题'
                  value={newFileTitle}
                  onChange={e => setNewFileTitle(e.target.value)}
                  style={{ width: '100%' }}
                  maxLength={100}
                  className='optimized-input'
                  disabled={isEditMode}
                />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className='space-y-4'>
              <div>
                <div className='flex items-center'>
                  <Text className='optimized-label'>标签</Text>
                  <Tooltip title='添加标签可以帮助用户更好地发现您的文章'>
                    <InfoCircleOutlined className='ml-2 text-gray-400' />
                  </Tooltip>
                </div>
                <div className='flex flex-wrap gap-2 mb-2'>
                  {tags.map((tag) => (
                    <Tag
                        key={tag}
                        closable
                        onClose={() => removeTag(tag)}
                        className='rounded-full'
                      >
                        {tag}
                      </Tag>
                  ))}
                </div>
                <div className='flex gap-2'>
                  <Input
                    placeholder='输入标签后按回车添加'
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onPressEnter={handleTagInputPress}
                    className='optimized-input flex-1'
                  />
                  <LiquidButton
                    variant='secondary'
                    size='small'
                    className='!h-10 !w-10 flex items-center justify-center p-0'
                    onClick={addTag}
                  >
                    <PlusOutlined />
                  </LiquidButton>
                </div>
              </div>
              <div>
                <Text className='optimized-label'>封面图片URL</Text>
                <Input
                  placeholder='https://example.com/image.jpg'
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  className='optimized-input'
                />
              </div>
            </div>
          </Col>
        </Row>
        <div className='mt-4'>
          <Text className='optimized-label'>文章摘要</Text>
          <Input.TextArea
            placeholder='自动生成的文章摘要，您可以手动修改'
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            rows={3}
            className='optimized-input'
          />
        </div>
      </Card>

      {/* 操作按钮栏 */}
      <Card className='mb-5 optimized-card'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <Space size='middle'>
            <Space>
              <LiquidButton
                variant='secondary'
                size='small'
                className='!h-9 !px-3 flex items-center gap-2'
                onClick={() => {
                  // 插入标题
                  const titleTemplate = '# 标题\n\n'
                  setMarkdownContent(titleTemplate + markdownContent)
                }}
              >
                <FileTextOutlined /> 标题
              </LiquidButton>
              <LiquidButton
                variant='secondary'
                size='small'
                className='!h-9 !px-3 flex items-center gap-2'
                onClick={() => {
                  // 插入代码块
                  const codeTemplate = '\n```\n// 在此处编写代码\n```\n'
                  setMarkdownContent(markdownContent + codeTemplate)
                }}
              >
                <FileTextOutlined /> 代码块
              </LiquidButton>
            </Space>

            <Divider type='vertical' className='h-8' />

            {/* 本地文件集成按钮组 */}
            <Space>
              <Tooltip title='从电脑选择 Markdown 文件导入'>
                <LiquidButton
                  variant='secondary'
                  size='small'
                  className='!h-9 !px-3 flex items-center gap-2 !border-indigo-200 !text-indigo-600 hover:!bg-indigo-50'
                  onClick={handleImportLocal}
                >
                  <ImportOutlined /> 导入本地
                </LiquidButton>
              </Tooltip>
              <Tooltip title='将当前草稿保存到本地磁盘'>
                <LiquidButton
                  variant='secondary'
                  size='small'
                  className='!h-9 !px-3 flex items-center gap-2'
                  onClick={handleExportLocal}
                >
                  <ExportOutlined /> 存为本地
                </LiquidButton>
              </Tooltip>
            </Space>
          </Space>

          <Space>
            <LiquidButton
              variant='secondary'
              size='small'
              className='!h-9 !px-3 flex items-center gap-2'
              onClick={() => notification.info({
                message: '提示',
                description: '版本历史功能即将推出',
                duration: 3,
              })}
            >
              <HistoryOutlined /> 版本历史
            </LiquidButton>
            <LiquidButton
              variant='ghost'
              size='small'
              className='!h-9 !px-4 flex items-center gap-2 !text-indigo-600 hover:!text-indigo-700 font-medium'
              onClick={() => handleSave(markdownContent, 'PUBLISHED')}
            >
              <CloudUploadOutlined /> 发布文章
            </LiquidButton>
          </Space>
        </div>
      </Card>

      {/* Suspense 处理异步加载的组件，fallback 为加载占位符 */}
      <Suspense
        fallback={
          <div className='flex justify-center p-6'>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
                }
      >
        <MarkdownEditor
          initialValue={markdownContent}
          onSave={handleSave}
        />
      </Suspense>

      {/* 预览模态框 */}
      <Modal
        title='文章预览'
        open={isPreviewVisible}
        onCancel={closePreview}
        footer={[
          <LiquidButton key='close' variant='secondary' onClick={closePreview} className='!h-10 !px-6'>
            关闭
          </LiquidButton>
        ]}
        width='80%'
        className='optimized-card'
      >
        <div className='p-4 bg-white rounded-lg'>
          <h1 className='text-3xl font-bold mb-4'>{newFileTitle || '未命名文章'}</h1>
          {coverImage && (
            <img src={coverImage} alt='封面' className='w-full h-auto rounded-lg mb-4' loading='lazy' decoding='async' />
          )}
          <div className='flex flex-wrap gap-2 mb-4'>
            {tags.map(tag => (
              <Tag key={tag} className='rounded-full'>{tag}</Tag>
            ))}
          </div>
          <div className='prose max-w-none'>
            <div dangerouslySetInnerHTML={{ __html: markdownContent.replace(/\n/g, '<br>') }} />
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
