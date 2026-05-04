import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Tooltip } from 'antd'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import {
  FileTextOutlined,
  SearchOutlined,
  SettingOutlined,
  EditOutlined,
  BookOutlined,
  LogoutOutlined,
  BellOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useAppUser } from '@/hooks'
import { useUnreadNotificationCount } from '@/api/graphql/notification'

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  onClick?: () => void;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

interface IconSidebarProps {
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'
const SIDEBAR_ACTION_SIZE = 'w-11 h-11'
const SIDEBAR_ICON_SIZE = 24

const IconSidebar: React.FC<IconSidebarProps> = ({ isDarkMode = false, onThemeToggle }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin, user, logout } = useAppUser()

  // 获取未读通知数量 (静态模式跳过)
  const { data: unreadData } = useUnreadNotificationCount({
    skip: isStatic || !isAuthenticated
  })
  const unreadCount = unreadData?.unreadNotificationCount || 0

  // 顶部导航菜单项
  const topMenuItems: MenuItem[] = [
    {
      key: 'posts',
      icon: <FileTextOutlined />,
      label: isStatic ? '文章列表' : '文章',
      path: '/home',
    },
    ...(!isStatic
      ? [{
          key: 'tags',
          icon: <AppstoreOutlined />,
          label: '标签分类',
          path: '/tags',
        }]
      : []),
    {
      key: 'search',
      icon: <SearchOutlined />,
      label: '搜索',
      path: '/search',
    },
    ...(!isStatic
      ? [
          {
            key: 'insight',
            icon: <DeploymentUnitOutlined />,
            label: '知识洞察',
            path: '/insight',
          },
          {
            key: 'reference',
            icon: <BookOutlined />,
            label: '知识卡片',
            path: '/reference',
          }
        ]
      : []),
    {
      key: 'liquid-glass',
      icon: <ExperimentOutlined />,
      label: '液态玻璃',
      path: '/liquid-glass',
    },
    ...(!isStatic && isAuthenticated
      ? [{
          key: 'notifications',
          icon: <BellOutlined />,
          label: '通知中心',
          path: '/notifications',
          requireAuth: true,
        }]
      : []),
    ...(!isStatic && isAuthenticated
      ? [{
          key: 'editor',
          icon: <EditOutlined />,
          label: '写文章',
          path: '/editor/posts',
          requireAuth: true,
        }]
      : []),
    ...(!isStatic && isAdmin
      ? [{
          key: 'admin',
          icon: <SettingOutlined />,
          label: '管理员控制台',
          path: '/admin',
          requireAdmin: true,
        }]
      : []),
  ]

  // 过滤菜单项
  const filterMenuItems = (items: MenuItem[]) => {
    return items.filter(item => {
      if (item.requireAdmin && !isAdmin) return false
      return !(item.requireAuth && !isAuthenticated)
    })
  }

  const filteredTopItems = filterMenuItems(topMenuItems)

  // 判断是否为当前路径
  const isActive = (path?: string) => {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // 菜单项点击处理
  const handleItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  // 渲染菜单项的通用组件
  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.path)
    return (
      <Tooltip key={item.key} title={item.label} placement='right'>
        <div
          onClick={() => handleItemClick(item)}
          className={`${SIDEBAR_ACTION_SIZE} flex items-center justify-center cursor-pointer transition-all duration-200 rounded-xl
            ${active
              ? (isDarkMode ? 'text-white bg-white/10' : 'text-gray-900 bg-black/5')
              : (isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-black/5')
            }`}
          style={{ position: 'relative' }}
        >
          <span className='inline-flex items-center justify-center leading-none' style={{ fontSize: `${SIDEBAR_ICON_SIZE}px` }}>
            {item.icon}
          </span>
          {/* 通知红点徽章 */}
          {item.key === 'notifications' && unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                backgroundColor: '#ff4d4f',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '0 5px',
                fontSize: '10px',
                fontWeight: 'bold',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </Tooltip>
    )
  }

  return (
    <div className='fixed left-0 top-0 h-screen z-50 pointer-events-none'>
      <aside
        style={{
          width: '72px',
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          padding: '1.5rem 0',
          pointerEvents: 'auto',
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(2, 6, 23, 0.78) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.9) 100%)',
          borderRight: `1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.32)'}`,
          boxShadow: isDarkMode
            ? '0 18px 42px -28px rgba(2, 6, 23, 0.95)'
            : '0 16px 34px -26px rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        className='transition-colors duration-300'
      >
        {/* 顶部：Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '1rem' }}>
          <div className='cursor-pointer' onClick={() => navigate(isStatic ? '/home' : '/')}>
            <Tooltip title='Blog' placement='right'>
              <div
              className='w-11 h-11 flex items-center justify-center transition-all'
              style={{
                color: isDarkMode ? '#ffffff' : '#111827',
              }}
            >
              <span className='font-bold leading-none' style={{ fontSize: `${SIDEBAR_ICON_SIZE}px` }}>B</span>
            </div>
            </Tooltip>
          </div>
        </div>

        {/* 中间：菜单项（可滚动） */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {filteredTopItems.map(renderMenuItem)}
        </div>

        {/* 底部：主题切换 + 用户头像 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '1rem',
          }}
        >
          {/* 主题切换 */}
          {onThemeToggle && (
            <ThemeToggleButton compact useLiquid={false} chromeless iconSize={SIDEBAR_ICON_SIZE} />
          )}

          {/* 退出登录 */}
          {!isStatic && isAuthenticated && (
            <Tooltip title='退出登录' placement='right'>
              <div
                onClick={() => logout()}
                className={`${SIDEBAR_ACTION_SIZE} flex items-center justify-center cursor-pointer transition-all duration-200 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full`}
              >
                <LogoutOutlined style={{ fontSize: `${SIDEBAR_ICON_SIZE}px` }} />
              </div>
            </Tooltip>
          )}

          {/* 用户头像 */}
          {!isStatic && isAuthenticated && user && (
            <Tooltip title={user.username || '用户'} placement='right'>
              <div
                onClick={() => navigate('/profile')}
                className='cursor-pointer transition-all duration-200'
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(user.avatar
                    ? {
                        backgroundImage: `url(${user.avatar})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }
                    : {
                        backgroundColor: isDarkMode ? '#2a2a2a' : '#f3f4f6',
                      }
                  ),
                }}
              >
                {!user.avatar && (
                  <span
                    style={{
                      color: isDarkMode ? '#ffffff' : '#111827',
                      fontSize: '22px',
                      fontWeight: 'bold',
                    }}
                  >
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </Tooltip>
          )}
        </div>
      </aside>
    </div>
  )
}

export default IconSidebar
