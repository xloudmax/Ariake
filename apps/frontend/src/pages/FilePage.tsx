// src/pages/FilePage.tsx
// 查看单篇文章内容的页面
import {
  useEffect as useFileEffect,
  useState as useFileState,
  lazy,
  Suspense,
} from 'react'
import { useParams as useFileParams } from 'react-router-dom'
import { Spin, Alert, Card, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
// MarkdownViewer 在查看页面才会被加载
const MarkdownViewer = lazy(() => import('../components/MarkdownViewer'))

const { Title, Paragraph } = Typography

export default function FilePage () {
  const { file } = useFileParams<{ file: string }>()
  const [content, setContent] = useFileState<string>('')
  const [loading, setLoading] = useFileState(true)
  const [error, setError] = useFileState<string | undefined>(undefined)

  // 根据路由参数加载文章内容
  useFileEffect(() => {
    if (!file) {
      setError('参数不足：文件名缺失')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(undefined)
    // 简化实现，直接设置空内容
    setContent('')
    setLoading(false)
  }, [file])

  if (loading) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-900'>
        <div className='max-w-7xl mx-auto px-10 py-12'>
          <div className='flex justify-center p-6'>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-900'>
        <div className='max-w-7xl mx-auto px-10 py-12'>
          <Card className='m-5 mx-8'>
            <Alert message={error} type='error' showIcon />
          </Card>
        </div>
      </div>
    )
  }

  // 使用 Suspense 包裹异步组件，提供加载状态
  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-900' style={{ padding: '0 40px', boxSizing: 'border-box' }}>
      <div className='max-w-7xl mx-auto py-12'>
        {/* 标准页面标题 */}
        <div className='mb-6'>
          <Title level={2} className='mb-4'>
            文件预览
          </Title>
          <Paragraph type='secondary' className='mb-0'>
            查看 Markdown 文件内容
          </Paragraph>
        </div>

        <Card className='m-5 mx-8'>
          <Suspense
            fallback={
              <div className='flex justify-center p-6'>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              </div>
                        }
          >
            <MarkdownViewer content={content} />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}
