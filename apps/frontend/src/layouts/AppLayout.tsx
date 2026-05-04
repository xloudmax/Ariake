import { useContext, Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Link, Outlet, useLocation } from 'react-router-dom'
import {
  Layout,
  Typography,
  Grid
} from 'antd'
// ... (rest of imports remains the same)
import { ThemeContext } from '../components/ThemeProvider'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import IconSidebar from '@/components/IconSidebar'
import MobileBottomBar from '@/components/MobileBottomBar'
import PageLoading from '@/components/PageLoading'
import { MeshGradientBackground } from '@/components/MeshGradientBackground'
import BackToTop from '@/components/BackToTop'
import TauriTitleBar from '@/components/TauriTitleBar'
import { isCorePublicPath } from '@/utils/performance'

// ... (lazy imports)
const HomePage = lazy(() => import('@/pages/HomePage'))
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage'))
const EditorPage = lazy(() => import('@/pages/EditorPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const TagsPage = lazy(() => import('@/pages/TagsPage'))
const NotificationPage = lazy(() => import('@/pages/NotificationPage'))
const InsightPage = lazy(() => import('@/pages/InsightPage'))
const LiquidGlassTestPage = lazy(() => import('@/pages/LiquidGlassTestPage'))
const QuickRefListPage = lazy(() => import('@/pages/QuickRefListPage'))

const { Content, Footer } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

const isStatic = import.meta.env.VITE_STATIC_EXPORT === 'true'
const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

export default function AppLayout () {
  const { theme: appTheme, toggle } = useContext(ThemeContext)
  const screens = useBreakpoint()
  const location = useLocation()

  // 使用自定义 Hook 处理离线文章同步 (静态模式通过 skip 选项跳过)
  useOfflineSync({ skip: isStatic })

  // 桌面端 (Tauri) 极致预加载优化
  useEffect(() => {
    if (isTauri) {
      // 在首页稳定后的 3 秒，静默提前拉取文章详情页的 JS Chunk
      const timer = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('🚀 [Tauri Perf] Aggressively prefetching PostDetailPage chunk...')
        import('@/pages/PostDetailPage').catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[Tauri Perf] Prefetch failed (this is harmless, likely due to a chunk update):', err)
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Determine sidebar width based on screen size (0 on mobile, 72px on desktop)
  const isMobile = !screens.md
  const shouldShowAnimatedBackground = isCorePublicPath(location.pathname)

  return (
    <>
      <TauriTitleBar />
      {/* Global Animated Background */}
      {shouldShowAnimatedBackground && <MeshGradientBackground />}

      {/* 图标侧边栏 - Desktop Only */}
      <div className='hidden md:block'>
        <IconSidebar
          isDarkMode={appTheme === 'dark'}
          onThemeToggle={toggle}
        />
      </div>

      {/* 移动端底部导航 - Mobile Only */}
      {isMobile && <MobileBottomBar />}

      <Layout
        className='min-h-screen' style={{
          marginLeft: isMobile ? 0 : '72px',
          // For Native iOS (Tauri), we need 140px to accommodate native bar + mini player.
          // For Web browser mobile, we only need ~90px for the React MobileBottomBar.
          marginBottom: isMobile ? (isTauri ? '140px' : '90px') : 0,
          backgroundColor: 'transparent',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Content style={{
          backgroundColor: 'transparent',
          padding: isMobile ? 'env(safe-area-inset-top) 1rem 0' : '2rem 1.5rem 0',
          flex: 1
        }}
        >
          <Suspense fallback={<PageLoading />}>
            <div className='page-enter-active min-h-full'>
              {isStatic
                ? <Outlet />
                : (
                  <Routes>
                      <Route path='/home' element={<HomePage />} />
                      <Route path='/search' element={<SearchPage />} />
                      <Route path='/insight' element={<InsightPage />} />
                      <Route path='/reference' element={<QuickRefListPage />} />
                      <Route path='/tags' element={<TagsPage />} />
                      <Route path='/notifications' element={<NotificationPage />} />
                      <Route path='/profile' element={<ProfilePage />} />
                      <Route path='/liquid-glass' element={<LiquidGlassTestPage />} />
                      <Route path='/post/:slug' element={<PostDetailPage />} />
                      <Route path='/login' element={<LoginPage />} />
                      <Route path='/register' element={<RegisterPage />} />
                      <Route path='/forgot-password' element={<ForgotPasswordPage />} />
                      <Route path='/editor/posts' element={<EditorPage />} />
                      <Route path='/editor/posts/:file' element={<EditorPage />} />
                      <Route path='/admin/*' element={<AdminPage />} />
                      <Route
                        path='*'
                        element={
                            <div className='flex items-center justify-center min-h-screen'>
                                <div className='text-center'>
                                    <p className='text-lg mb-4'>页面未找到</p>
                                    <Link to='/home' className='text-blue-600 hover:text-blue-800'>
                                        返回文章列表
                                                    </Link>
                                  </div>
                              </div>
                                        }
                      />
                    </Routes>
                  )}
            </div>
          </Suspense>
        </Content>
        {!isMobile && (
          <Footer className='border-t border-[color:var(--surface-border)] bg-[color:var(--surface-elevated-glass)] text-center py-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl'>
            <Text className='text-sm text-[color:var(--surface-text-secondary)]'>Xloudmax © {new Date().getFullYear()}</Text>
          </Footer>
        )}
      </Layout>

      {/* Global Back To Top */}
      <BackToTop />
    </>
  )
}
