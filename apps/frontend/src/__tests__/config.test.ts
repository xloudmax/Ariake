import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('getApiBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.doUnmock('@/utils/platform')
  })

  it('uses relative graphql/api base in web dev when no env override exists', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_API_BASE_URL', '')

    const { getApiBaseUrl } = await import('@/utils/config')

    expect(getApiBaseUrl()).toBe('')
  })

  it('keeps localhost absolute base for tauri desktop', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.doMock('@/utils/platform', () => ({
      isIOS: false,
      isTauri: true,
      isStatic: false,
    }))

    const { getApiBaseUrl } = await import('@/utils/config')

    expect(getApiBaseUrl()).toBe('http://localhost:11451')
  })
})
