import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, MotionValue, useSpring } from 'framer-motion'
import {
  HomeOutlined,
  SearchOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { ThemeContext } from './ThemeProvider'
import { useAppUser } from '@/hooks'
import { CheapGlass, InteractiveGlass } from '@/components/liquid-system'

const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

const getTauriEvent = async () => {
  if (!isTauri) return null
  try {
    return await import('@tauri-apps/api/event')
  } catch {
    return null
  }
}

const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'

const getNavItems = (userAvatar?: string, isAuthenticated?: boolean, isAdmin?: boolean) => {
  if (isStatic) {
    return [
      { key: 'home', icon: <HomeOutlined />, label: '首页', path: '/home' },
      { key: 'search', icon: <SearchOutlined />, label: '搜索', path: '/search' },
    ]
  }
  const items = [
    { key: 'home', icon: <HomeOutlined />, label: '首页', path: '/home' },
    { key: 'search', icon: <SearchOutlined />, label: '搜索', path: '/search' },
    { key: 'insight', icon: <DeploymentUnitOutlined />, label: 'Insight', path: '/insight' },
    { key: 'tags', icon: <AppstoreOutlined />, label: '分类', path: '/tags' },
  ]

  if (isAdmin) {
    items.push({ key: 'admin', icon: <SettingOutlined />, label: '管理', path: '/admin' })
  }

  items.push({
    key: 'profile',
    icon: userAvatar ? <div className='w-6 h-6 rounded-full bg-cover border border-white/20' style={{ backgroundImage: `url(${userAvatar})` }} /> : <UserOutlined />,
    label: '我的',
    path: isAuthenticated ? '/profile' : '/login'
  })

  return items
}

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

/**
 * 视觉图标组件 - 纯静态，等待透镜
 */
const NavIcon = ({ index, item, x, tabWidth, isDarkMode }: { index: number, item: NavItem, x: MotionValue<number>, tabWidth: number, isDarkMode: boolean }) => {
  const distance = useTransform(x, (val) => Math.abs(val - index * tabWidth))
  const opacity = useTransform(distance, [0, tabWidth], [1, 0.25])

  return (
    <div className='flex-1 h-full flex flex-col items-center justify-center gap-1'>
      <motion.div
        style={{ opacity, color: isDarkMode ? '#fff' : '#000' }}
        className='text-xl flex items-center justify-center pointer-events-none'
      >
        {item.icon}
      </motion.div>
      <motion.span
        style={{ opacity, color: isDarkMode ? '#fff' : '#000' }}
        className='text-[9px] font-black tracking-tight pointer-events-none'
      >
        {item.label}
      </motion.span>
    </div>
  )
}

const MobileBottomBar: React.FC = React.memo(() => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useContext(ThemeContext)
  const { isAuthenticated, isAdmin, user } = useAppUser()
  const isDarkMode = theme === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)

  // Immediate detection to avoid flickering on iOS
  const [isIOS, setIsIOS] = useState(() =>
    typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  )

  useEffect(() => {
    if (!isTauri) return
    let cancelled = false;
    (async () => {
      try {
        const [{ type }, tauriEvent] = await Promise.all([
          import('@tauri-apps/plugin-os'),
          getTauriEvent(),
        ])
        if (cancelled) return
        if (type() === 'ios') {
          setIsIOS(true)
          tauriEvent?.emit('show-native-bar')
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Platform detection failed:', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const guiConfig = useMemo(() => ({
    brightness: 1.15,
    contrast: 1.1,
  }), [])

  const x = useMotionValue(0)
  const pillOpacity = useSpring(1, { stiffness: 400, damping: 25 })

  // 动态尺寸弹簧
  const pillWidthSpring = useSpring(74, { stiffness: 400, damping: 25 })
  const pillHeightSpring = useSpring(54, { stiffness: 400, damping: 25 })

  const [containerWidth, setContainerWidth] = useState(0)
  const [isActive, setIsActive] = useState(false)

  const navItems = useMemo(() => getNavItems(user?.avatar ?? undefined, isAuthenticated, isAdmin), [user?.avatar, isAuthenticated, isAdmin])

  // Sync native tab bar changes
  useEffect(() => {
    if (!isIOS) return

    // Listen for custom tab-changed events from Swift
    const handleTabChanged = (event: Event) => {
      const idx = (event as CustomEvent).detail?.index
      if (typeof idx === 'number' && navItems[idx]) {
        navigate(navItems[idx].path)
      }
    }

    window.addEventListener('tab-changed', handleTabChanged)

    // Also try to sync initial state once mounted
    if (isTauri) {
      getTauriEvent().then(m => m?.emit('show-native-bar'))
    }

    return () => {
      window.removeEventListener('tab-changed', handleTabChanged)
    }
  }, [isIOS, navigate, navItems])

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex(item => location.pathname === item.path || (item.path !== '/home' && location.pathname.startsWith(item.path)))
    return idx === -1 ? 0 : idx
  }, [location.pathname, navItems])

  const tabWidth = useMemo(() => containerWidth / navItems.length, [containerWidth, navItems.length])
  const barHeight = 64

  useEffect(() => {
    if (containerWidth > 0 && !isActive) {
      animate(x, activeIndex * tabWidth, { type: 'spring', stiffness: 450, damping: 38 })
    }
  }, [activeIndex, containerWidth, tabWidth, x, isActive])

  useEffect(() => {
    const updateWidth = () => { if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth) }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const handleInteraction = useCallback((targetX: number) => {
    const nextIndex = Math.max(0, Math.min(navItems.length - 1, Math.floor(targetX / tabWidth)))
    animate(x, nextIndex * tabWidth, {
      type: 'spring',
      stiffness: 450,
      damping: 38,
      onComplete: () => {
        if (nextIndex !== activeIndex) {
          navigate(navItems[nextIndex].path)
          getTauriEvent().then(m => m?.emit('haptic-feedback', { type: 'selection' }))
        }
        // 恢复状态
        pillOpacity.set(1)
        pillWidthSpring.set(74)
        pillHeightSpring.set(54)
        setTimeout(() => setIsActive(false), 80)
      }
    })
  }, [activeIndex, navItems, navigate, tabWidth, x, pillOpacity, pillWidthSpring, pillHeightSpring])

  const onStartInteraction = () => {
    setIsActive(true)
    // 交互时变大，产生被“捏”和“膨胀”的效果
    pillOpacity.set(0.85)
    pillWidthSpring.set(88) // 变宽
    pillHeightSpring.set(68) // 变高 (超出底座高度产生强烈放大感)
  }

  // 动态居中计算
  const centerOffset = useTransform(pillWidthSpring, (w) => (tabWidth - w) / 2)
  const verticalOffset = useTransform(pillHeightSpring, (h) => (barHeight - h) / 2)

  // 提升 useTransform 调用到顶级，确保在所有条件下都执行
  const pillX = useTransform([x, centerOffset], ([xVal, offset]) => (xVal as number) + (offset as number))
  const sliderBorderRadius = useTransform(pillHeightSpring, (h) => h / 2)

  // 只有在 Tauri 环境下的 iOS 原生模式才隐藏 React 版本的底部栏
  const isNativeIOS = isIOS && isTauri
  if (isNativeIOS) return null

  return (
    <div className='fixed bottom-4 left-4 right-4 z-[9999] md:hidden'>
      {/* 外层容器包裹背景，限制底座范围，不限制透镜溢出 */}
      <div className='mx-auto max-w-md w-full h-16 shadow-2xl relative select-none touch-none'>

        {/* 底座背景层 (可裁切) */}
        <CheapGlass
          variant='toolbar'
          tone={isDarkMode ? 'inverse' : 'neutral'}
          className='absolute inset-0 overflow-hidden'
          style={{
            borderRadius: '32px',
          }}
        />

        {/* 交互核心层，解除 overflow-hidden */}
        <div ref={containerRef} className='absolute inset-0'>
          {/* 1. 视觉图标层 (Z-0) */}
          <div className='flex justify-around items-center h-full relative z-0 px-1 pointer-events-none'>
            {containerWidth > 0 && navItems.map((item, index) => (
              <NavIcon key={item.key} index={index} item={item} x={x} tabWidth={tabWidth} isDarkMode={isDarkMode} />
            ))}
          </div>

          {/* 2. 真实物理透镜滑块 (Z-10) */}
          <motion.div
            style={{
              x: pillX,
              y: verticalOffset, // 动态垂直居中
              width: pillWidthSpring,
              height: pillHeightSpring,
              opacity: pillOpacity,
            }}
            className='absolute top-0 left-0 z-10 pointer-events-none'
          >
            <motion.div
              className='w-full h-full relative overflow-hidden'
              style={{ borderRadius: sliderBorderRadius }}
            >
              {/* 核心：物理折射引擎 - 背景+图标一体化放大，使用 GUI 参数 */}
              <InteractiveGlass
                variant='pill'
                tone={isDarkMode ? 'inverse' : 'neutral'}
                active={isActive}
                style={{ width: '100%', height: '100%' }}
                className='bg-transparent' // 确保背景透明，否则会阻断折射
              />

              {/* 菲涅耳全反射 & 增强亮度，部分使用 GUI 参数 */}
              <div
                className='absolute inset-0 z-[2] pointer-events-none'
                style={{
                  background: `radial-gradient(ellipse at center, 
                    rgba(255,255,255,0) 20%, 
                    rgba(255,255,255,${isDarkMode ? 0.05 : 0.1}) 60%, 
                    rgba(255,255,255,${isDarkMode ? 0.3 : 0.6}) 100%)`,
                  backdropFilter: `brightness(${guiConfig.brightness}) contrast(${guiConfig.contrast})`,
                  mixBlendMode: 'overlay',
                }}
              />

              {/* 物理边框亮线 */}
              <motion.div
                className='absolute inset-0 border-[1.5px]'
                style={{
                  borderRadius: sliderBorderRadius,
                  borderColor: `rgba(255,255,255,${isDarkMode ? 0.2 : 0.5})`,
                  boxShadow: `inset 0 0 12px rgba(255,255,255,${isDarkMode ? 0.1 : 0.3})`
                }}
              />
            </motion.div>
          </motion.div>
          {/* 3. 透明手势交互层 (Z-20) */}
          <motion.div
            drag='x'
            dragConstraints={containerRef}
            dragElastic={0.02}
            dragMomentum={false}
            onDragStart={onStartInteraction}
            onDrag={(_, info) => {
              const maxDragX = containerWidth - tabWidth
              const newX = Math.max(0, Math.min(maxDragX, activeIndex * tabWidth + info.offset.x))
              x.set(newX)
            }}
            onDragEnd={(_, info) => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                const localX = Math.max(0, Math.min(containerWidth - 1, info.point.x - rect.left))
                handleInteraction(localX)
              }
            }}
            onTap={(_, info) => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                const localX = Math.max(0, Math.min(containerWidth - 1, info.point.x - rect.left))
                onStartInteraction()
                handleInteraction(localX)
              }
            }}
            className='absolute inset-0 z-20 cursor-grab active:cursor-grabbing'
          />
        </div>
      </div>

      <div className='h-[env(safe-area-inset-bottom)] mt-2' />
    </div>
  )
})

export default MobileBottomBar
