import { describe, expect, it } from 'vitest'
import { resolveMeshBackgroundProfile } from '@/components/MeshGradientBackground'

describe('resolveMeshBackgroundProfile', () => {
  it('keeps the neon orb background active on core public routes by default', () => {
    const profile = resolveMeshBackgroundProfile({
      isDarkMode: true,
      pathname: '/home',
      reduceEffects: false,
    })

    expect(profile.lowPowerMode).toBe(false)
    expect(profile.targetFrameInterval).toBeCloseTo(1000 / 32)
    expect(profile.numOrbs).toBe(6)
    expect(profile.canvas.opacity).toBe(0.56)
    expect(profile.canvas.blur).toBe(110)
    expect(profile.colors).toEqual([
      'hsla(230, 92%, 60%, 0.50)',
      'hsla(252, 90%, 62%, 0.44)',
      'hsla(195, 88%, 56%, 0.36)',
      'hsla(282, 82%, 62%, 0.30)',
    ])
  })

  it('drops into low power mode only when effect reduction is requested', () => {
    const profile = resolveMeshBackgroundProfile({
      isDarkMode: true,
      pathname: '/home',
      reduceEffects: true,
    })

    expect(profile.lowPowerMode).toBe(true)
    expect(profile.targetFrameInterval).toBeCloseTo(1000 / 24)
    expect(profile.numOrbs).toBe(3)
    expect(profile.pulseRange).toBe(24)
  })

  it('keeps light mode softer without using dark glass opacity', () => {
    const profile = resolveMeshBackgroundProfile({
      isDarkMode: false,
      pathname: '/tags',
      reduceEffects: false,
    })

    expect(profile.lowPowerMode).toBe(false)
    expect(profile.canvas.opacity).toBe(0.34)
    expect(profile.canvas.blur).toBe(110)
    expect(profile.baseFill).toBe('#f8fafc')
    expect(profile.colors).toEqual([
      'hsla(212, 94%, 78%, 0.30)',
      'hsla(258, 88%, 80%, 0.24)',
      'hsla(192, 78%, 78%, 0.22)',
    ])
  })
})
