import { useState, useEffect } from 'react'
import { Tooltip } from 'antd'
import { LiquidButton } from './LiquidButton'
import { VerticalAlignTopOutlined } from '@ant-design/icons'

export default function BackToTop () {
  const [isVisible, setIsVisible] = useState(false)

  // 监听滚动，决定是否显示按钮
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <Tooltip title='返回顶部' placement='left'>
      <LiquidButton
        variant='primary'
        onClick={scrollToTop}
        className='!w-14 !h-14 !p-0 flex items-center justify-center !rounded-full shadow-lg border-white/20'
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          zIndex: 1000,
        }}
      >
        <VerticalAlignTopOutlined className='text-xl' />
      </LiquidButton>
    </Tooltip>
  )
}
