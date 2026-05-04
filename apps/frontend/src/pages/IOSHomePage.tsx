import { useState, useEffect } from 'react'
import { useBlogList } from '@/hooks'
import Typography from 'antd/es/typography'
import { Spin, Card, Tag, Alert } from 'antd'
import { getApiBaseUrl } from '@/utils/config'

const { Title, Text } = Typography

export default function IOSHomePage () {
  const { posts, loading, error, refetch } = useBlogList()
  const [pingStatus, setPingStatus] = useState<'testing' | 'ok' | 'fail'>('testing')
  const [pingError, setPingError] = useState<string | null>(null)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const baseUrl = getApiBaseUrl()
        const res = await fetch(`${baseUrl}/health/ping`)
        if (res.ok) {
          setPingStatus('ok')
        } else {
          setPingStatus('fail')
          setPingError(`Status: ${res.status}`)
        }
      } catch (err: unknown) {
        setPingStatus('fail')
        if (err instanceof Error) {
          setPingError(err.message)
        } else {
          setPingError(String(err))
        }
      }
    }
    checkBackend()
  }, [])

  const activeBaseUrl = getApiBaseUrl()

  return (
    <div className='p-6 pb-32'>
      <Title level={2} className='!text-white mb-6'>iOS Debug View</Title>

      <div className='mb-8 space-y-4'>
        <Card title='Connectivity Diagnostic' className='bg-white/5 border-white/10 text-white'>
          <div className='flex flex-col gap-2'>
            <div className='flex justify-between'>
              <Text className='text-gray-400'>Active API URL:</Text>
              <Text className='text-blue-400 font-mono text-xs'>{activeBaseUrl}</Text>
            </div>
            <div className='flex justify-between items-center'>
              <Text className='text-gray-400'>Backend Ping:</Text>
              {pingStatus === 'testing' && <Spin size='small' />}
              {pingStatus === 'ok' && <Tag color='success'>SUCCESS</Tag>}
              {pingStatus === 'fail' && <Tag color='error'>FAILED</Tag>}
            </div>
            {pingError && (
              <Alert message={pingError} type='error' showIcon className='mt-2 text-xs' />
            )}

            <div className='mt-4 pt-4 border-t border-white/10'>
              <Text className='text-gray-400 block mb-2'>Bridge Test (Manual Navigation):</Text>
              <div className='flex gap-2'>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('tab-changed', { detail: { index: 1 } }))}
                  className='px-2 py-1 bg-blue-500 rounded text-xs'
                >
                  Simulate Search (Idx 1)
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('tab-changed', { detail: { index: 2 } }))}
                  className='px-2 py-1 bg-green-500 rounded text-xs'
                >
                  Simulate Insight (Idx 2)
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Title level={4} className='!text-white mt-8 mb-4'>Latest Posts ({posts.length})</Title>

        {loading && posts.length === 0 && <Spin className='w-full py-12' />}

        {error && (
          <Alert
            message='GraphQL Error'
            description={error.message}
            type='error'
            showIcon
            action={<button onClick={() => refetch()} className='text-blue-400 underline'>Retry</button>}
          />
        )}

        <div className='space-y-4'>
          {posts.map(post => (
            <Card key={post.id} className='bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors'>
              <div className='flex flex-col gap-1'>
                <Text className='text-white font-bold text-lg'>{post.title}</Text>
                <div className='flex gap-2 mt-2'>
                  <Tag color='blue'>{post.status}</Tag>
                  <Text className='text-gray-500 text-xs self-center'>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
          {!loading && posts.length === 0 && !error && (
            <Text className='text-gray-500 italic'>No posts found.</Text>
          )}
        </div>
      </div>
    </div>
  )
}
