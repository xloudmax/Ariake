'use client'

import { useEffect, useId, useMemo, useReducer } from 'react'
import type { HeroGlassVariant, InteractiveGlassVariant } from './tokens'

export type GlassInteractionState =
    | 'idle'
    | 'hover'
    | 'focus'
    | 'selected'
    | 'pressed'
    | 'drag'
    | 'resize'
    | 'scroll-heavy'

type GlassGrade = 'hero' | 'interactive' | 'cheap'

type UseGlassCapabilityOptions = {
  grade: GlassGrade;
  interactionState?: GlassInteractionState;
  interactiveVariant?: InteractiveGlassVariant;
  heroVariant?: HeroGlassVariant;
  fixedChrome?: boolean;
  viewportCovering?: boolean;
}

type GlassCapability = {
  allowRefraction: boolean;
  renderGrade: GlassGrade | 'interactive';
  isChromiumLike: boolean;
  isMobileBudget: boolean;
}

let heroOwnerId: string | null = null
const heroListeners = new Set<() => void>()

function notifyHeroListeners () {
  heroListeners.forEach((listener) => listener())
}

function isSupportedChromium (userAgent: string) {
  const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  const isFirefox = /Firefox/i.test(userAgent)
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR|CriOS/i.test(userAgent)
  const isChromium = /Chrome|Chromium|Edg|OPR|CriOS/i.test(userAgent)
  return {
    isChromiumLike: isTauri || (isChromium && !isSafari && !isFirefox),
    isSafari,
    isFirefox,
  }
}

function isLowEndBudget () {
  if (typeof navigator === 'undefined') {
    return false
  }

  const deviceMemory = 'deviceMemory' in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) : 8
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8
  return deviceMemory <= 4 || hardwareConcurrency <= 4
}

function isTouchMobile () {
  if (typeof window === 'undefined') {
    return false
  }

  const pointerCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  return window.innerWidth < 768 || pointerCoarse || mobileUA
}

function interactiveVariantAllowsMobile (variant?: InteractiveGlassVariant) {
  return variant === 'search' || variant === 'pill'
}

function heroVariantAllowsInteractiveFallback (variant?: HeroGlassVariant) {
  return variant === 'spotlight' || variant === 'poster' || variant === 'orb'
}

export function useGlassCapability ({
  grade,
  interactionState = 'idle',
  interactiveVariant,
  heroVariant,
  fixedChrome = false,
  viewportCovering = false,
}: UseGlassCapabilityOptions): GlassCapability {
  const heroId = useId()
  const [, bumpHeroVersion] = useReducer((value: number) => value + 1, 0)

  useEffect(() => {
    heroListeners.add(bumpHeroVersion)
    return () => {
      heroListeners.delete(bumpHeroVersion)
    }
  }, [])

  useEffect(() => {
    if (grade !== 'hero') {
      return
    }

    if (heroOwnerId === null) {
      heroOwnerId = heroId
      notifyHeroListeners()
    }

    return () => {
      if (heroOwnerId === heroId) {
        heroOwnerId = null
        notifyHeroListeners()
      }
    }
  }, [grade, heroId])

  const capability = useMemo(() => {
    if (grade === 'cheap' || typeof window === 'undefined') {
      return {
        allowRefraction: false,
        renderGrade: 'cheap' as const,
        isChromiumLike: false,
        isMobileBudget: false,
      }
    }

    const { isChromiumLike } = isSupportedChromium(navigator.userAgent)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const isMobileBudget = isTouchMobile() || reducedMotion || isLowEndBudget()
    const blockedByInteraction = interactionState === 'drag' ||
            interactionState === 'resize' ||
            interactionState === 'scroll-heavy' ||
            interactionState === 'pressed'

    const mobileAllowed = grade === 'interactive' && interactiveVariantAllowsMobile(interactiveVariant)
    const baseAllowed = isChromiumLike &&
            !fixedChrome &&
            !viewportCovering &&
            !blockedByInteraction &&
            (!isMobileBudget || mobileAllowed)

    if (grade === 'interactive') {
      return {
        allowRefraction: baseAllowed,
        renderGrade: baseAllowed ? 'interactive' as const : 'cheap' as const,
        isChromiumLike,
        isMobileBudget,
      }
    }

    const ownsHeroSlot = heroOwnerId === heroId

    const allowRefraction = baseAllowed && ownsHeroSlot && !isMobileBudget
    const renderGrade: GlassCapability['renderGrade'] = allowRefraction
      ? 'hero'
      : isChromiumLike && heroVariantAllowsInteractiveFallback(heroVariant)
        ? 'interactive'
        : 'cheap'

    return {
      allowRefraction,
      renderGrade,
      isChromiumLike,
      isMobileBudget,
    }
  }, [grade, heroId, heroVariant, interactionState, interactiveVariant, fixedChrome, viewportCovering])

  useEffect(() => {
    if (grade !== 'hero' && heroOwnerId === heroId) {
      heroOwnerId = null
      notifyHeroListeners()
    }
  }, [grade, heroId])

  return capability
}
