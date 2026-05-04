import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CheapGlass, HeroGlass, InteractiveGlass } from '@/components/liquid-system'

const originalMatchMedia = window.matchMedia
const originalInnerWidth = window.innerWidth
const originalUserAgent = navigator.userAgent

function setRuntime ({
  userAgent,
  width,
  coarsePointer = false,
  reducedMotion = false,
}: {
  userAgent: string;
  width: number;
  coarsePointer?: boolean;
  reducedMotion?: boolean;
}) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  })

  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('pointer: coarse') ? coarsePointer : query.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('liquid glass system wrappers', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
    window.matchMedia = originalMatchMedia
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('CheapGlass never renders SVG filter nodes', () => {
    setRuntime({
      userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36',
      width: 1440,
    })

    const { container } = render(
      <CheapGlass variant='card' style={{ width: 200, height: 120 }}>
        cheap
      </CheapGlass>
    )

    expect(container.querySelector('filter')).toBeNull()
    expect(container.querySelector('feDisplacementMap')).toBeNull()
  })

  it('InteractiveGlass refuses refraction during active drag states', () => {
    setRuntime({
      userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36',
      width: 1440,
    })

    const { container } = render(
      <InteractiveGlass variant='pill' active style={{ width: 120, height: 56 }}>
        active
      </InteractiveGlass>
    )

    expect(container.querySelector('filter')).toBeNull()
    expect(container.querySelector('feDisplacementMap')).toBeNull()
  })

  it('HeroGlass renders the full filter pipeline on supported Chromium desktop', async () => {
    setRuntime({
      userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36',
      width: 1440,
    })

    const { container } = render(
      <HeroGlass variant='poster' style={{ width: 320, height: 180, borderRadius: 32 }}>
        hero
      </HeroGlass>
    )

    await waitFor(() => {
      expect(container.querySelector('filter')).not.toBeNull()
      expect(container.querySelector('feDisplacementMap')).not.toBeNull()
    })
  })

  it('HeroGlass degrades outside the supported Chromium budget', async () => {
    setRuntime({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      width: 390,
      coarsePointer: true,
    })

    const { container } = render(
      <HeroGlass variant='poster' style={{ width: 320, height: 180, borderRadius: 32 }}>
        hero
      </HeroGlass>
    )

    await waitFor(() => {
      expect(container.querySelector('filter')).toBeNull()
      expect(container.querySelector('feDisplacementMap')).toBeNull()
    })
  })
})
