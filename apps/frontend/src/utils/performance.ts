const CORE_PUBLIC_ROUTES = new Set([
  '/home',
  '/search',
  '/tags',
  '/reference',
])

const POST_ROUTE_PREFIX = '/post/'

export const isCorePublicPath = (pathname: string) => {
  if (CORE_PUBLIC_ROUTES.has(pathname)) return true
  return pathname.startsWith(POST_ROUTE_PREFIX)
}

export const shouldReduceEffects = () => {
  if (typeof window === 'undefined') return false

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8

  return prefersReducedMotion || deviceMemory <= 4 || hardwareConcurrency <= 4
}

export const canPrefetchOnHover = () => {
  if (typeof window === 'undefined') return false

  const supportsFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false

  return supportsFinePointer && !saveData
}

export const scheduleIdleTask = (callback: () => void, timeout = 500) => {
  if (typeof window === 'undefined') {
    callback()
    return () => {}
  }

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  }

  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(callback, { timeout })
    return () => {
      if (typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(id)
      }
    }
  }

  const id = window.setTimeout(callback, Math.min(timeout, 120))
  return () => window.clearTimeout(id)
}
