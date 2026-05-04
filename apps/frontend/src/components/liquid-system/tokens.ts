import type { CSSProperties } from 'react'
import { CONVEX, CONVEX_CIRCLE, LIP } from '@/components/LiquidKit/liquid-lib'

export type GlassTone = 'neutral' | 'brand' | 'inverse'
export type CheapGlassVariant = 'sidebar' | 'toolbar' | 'card' | 'overlay'
export type InteractiveGlassVariant = 'search' | 'pill' | 'button' | 'control'
export type HeroGlassVariant = 'spotlight' | 'poster' | 'orb'

type GlassShellToken = {
  className: string;
  highlightClassName?: string;
  blurPx: number;
  saturate: number;
  shadow: string;
}

type CoreOptics = {
  blur: number;
  glassThickness: number;
  bezelWidth: number;
  refractiveIndex: number;
  specularOpacity: number;
  specularSaturation: number;
  bezelHeightFn?: (x: number) => number;
}

type InteractiveToken = GlassShellToken & {
  fallbackVariant: CheapGlassVariant;
  mobileApproved: boolean;
  core: CoreOptics;
}

type HeroToken = GlassShellToken & {
  core: CoreOptics;
}

const toneShells: Record<GlassTone, { base: string; cheap: string }> = {
  neutral: {
    base: 'text-[color:var(--glass-neutral-text)]',
    cheap: 'bg-[color:var(--glass-neutral-surface)] border-[color:var(--glass-neutral-border)]',
  },
  brand: {
    base: 'text-[color:var(--glass-brand-text)]',
    cheap: 'bg-[color:var(--glass-brand-surface)] border-[color:var(--glass-brand-border)]',
  },
  inverse: {
    base: 'text-[color:var(--glass-inverse-text)]',
    cheap: 'bg-[color:var(--glass-inverse-surface)] border-[color:var(--glass-inverse-border)]',
  },
}

const cheapVariantTokens: Record<CheapGlassVariant, Omit<GlassShellToken, 'className'>> = {
  sidebar: {
    blurPx: 22,
    saturate: 165,
    shadow: '0 22px 44px -28px rgba(15, 23, 42, 0.55)',
    highlightClassName: 'bg-gradient-to-b from-white/18 via-white/6 to-transparent dark:from-white/10 dark:via-white/0 dark:to-transparent',
  },
  toolbar: {
    blurPx: 20,
    saturate: 180,
    shadow: '0 18px 38px -24px rgba(15, 23, 42, 0.45)',
    highlightClassName: 'bg-gradient-to-b from-white/22 via-white/8 to-transparent dark:from-white/10 dark:via-white/0 dark:to-transparent',
  },
  card: {
    blurPx: 18,
    saturate: 155,
    shadow: '0 18px 42px -26px rgba(15, 23, 42, 0.32)',
    highlightClassName: 'bg-gradient-to-br from-white/18 via-white/8 to-transparent dark:from-white/8 dark:via-white/0 dark:to-transparent',
  },
  overlay: {
    blurPx: 24,
    saturate: 185,
    shadow: '0 32px 70px -34px rgba(15, 23, 42, 0.5)',
    highlightClassName: 'bg-gradient-to-b from-white/28 via-white/10 to-transparent dark:from-white/12 dark:via-white/0 dark:to-transparent',
  },
}

const interactiveVariantTokens: Record<InteractiveGlassVariant, Omit<InteractiveToken, 'className'>> = {
  search: {
    fallbackVariant: 'toolbar',
    mobileApproved: true,
    blurPx: 16,
    saturate: 165,
    shadow: '0 18px 38px -24px rgba(15, 23, 42, 0.28)',
    highlightClassName: 'bg-gradient-to-b from-white/18 via-white/6 to-transparent dark:from-white/10 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 16,
      bezelWidth: 10,
      refractiveIndex: 1.22,
      blur: 0.12,
      specularOpacity: 0.35,
      specularSaturation: 3.5,
      bezelHeightFn: CONVEX.fn,
    },
  },
  pill: {
    fallbackVariant: 'toolbar',
    mobileApproved: true,
    blurPx: 18,
    saturate: 180,
    shadow: '0 20px 42px -26px rgba(15, 23, 42, 0.34)',
    highlightClassName: 'bg-gradient-to-b from-white/28 via-white/10 to-transparent dark:from-white/16 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 72,
      bezelWidth: 34,
      refractiveIndex: 1.72,
      blur: 0,
      specularOpacity: 0.42,
      specularSaturation: 4.5,
      bezelHeightFn: CONVEX_CIRCLE.fn,
    },
  },
  button: {
    fallbackVariant: 'card',
    mobileApproved: false,
    blurPx: 14,
    saturate: 150,
    shadow: '0 12px 28px -18px rgba(15, 23, 42, 0.24)',
    highlightClassName: 'bg-gradient-to-b from-white/24 via-white/6 to-transparent dark:from-white/12 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 12,
      bezelWidth: 6,
      refractiveIndex: 1.2,
      blur: 0.08,
      specularOpacity: 0.3,
      specularSaturation: 3,
      bezelHeightFn: CONVEX.fn,
    },
  },
  control: {
    fallbackVariant: 'card',
    mobileApproved: false,
    blurPx: 16,
    saturate: 160,
    shadow: '0 16px 36px -22px rgba(15, 23, 42, 0.28)',
    highlightClassName: 'bg-gradient-to-br from-white/18 via-white/6 to-transparent dark:from-white/10 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 24,
      bezelWidth: 10,
      refractiveIndex: 1.28,
      blur: 0.14,
      specularOpacity: 0.35,
      specularSaturation: 4,
      bezelHeightFn: CONVEX.fn,
    },
  },
}

const heroVariantTokens: Record<HeroGlassVariant, Omit<HeroToken, 'className'>> = {
  spotlight: {
    blurPx: 18,
    saturate: 170,
    shadow: '0 24px 60px -28px rgba(15, 23, 42, 0.48)',
    highlightClassName: 'bg-gradient-to-br from-white/18 via-white/8 to-transparent dark:from-white/8 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 22,
      bezelWidth: 14,
      refractiveIndex: 1.22,
      blur: 0.18,
      specularOpacity: 0.28,
      specularSaturation: 2.5,
      bezelHeightFn: CONVEX.fn,
    },
  },
  poster: {
    blurPx: 22,
    saturate: 185,
    shadow: '0 38px 84px -34px rgba(15, 23, 42, 0.58)',
    highlightClassName: 'bg-gradient-to-br from-white/20 via-white/8 to-transparent dark:from-white/10 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 42,
      bezelWidth: 24,
      refractiveIndex: 1.5,
      blur: 0.22,
      specularOpacity: 0.85,
      specularSaturation: 5,
      bezelHeightFn: LIP.fn,
    },
  },
  orb: {
    blurPx: 24,
    saturate: 190,
    shadow: '0 42px 90px -36px rgba(15, 23, 42, 0.6)',
    highlightClassName: 'bg-gradient-to-b from-white/28 via-white/10 to-transparent dark:from-white/14 dark:via-white/0 dark:to-transparent',
    core: {
      glassThickness: 36,
      bezelWidth: 20,
      refractiveIndex: 1.4,
      blur: 0.2,
      specularOpacity: 0.7,
      specularSaturation: 4.5,
      bezelHeightFn: CONVEX_CIRCLE.fn,
    },
  },
}

export function getCheapGlassToken (variant: CheapGlassVariant = 'card', tone: GlassTone = 'neutral'): GlassShellToken {
  const toneToken = toneShells[tone]
  const variantToken = cheapVariantTokens[variant]
  return {
    className: `${toneToken.base} ${toneToken.cheap}`,
    ...variantToken,
  }
}

export function getInteractiveGlassToken (
  variant: InteractiveGlassVariant = 'control',
  tone: GlassTone = 'neutral'
): InteractiveToken {
  const toneToken = toneShells[tone]
  const variantToken = interactiveVariantTokens[variant]
  return {
    className: `${toneToken.base} ${toneToken.cheap}`,
    ...variantToken,
  }
}

export function getHeroGlassToken (variant: HeroGlassVariant = 'poster', tone: GlassTone = 'neutral'): HeroToken {
  const toneToken = toneShells[tone]
  const variantToken = heroVariantTokens[variant]
  return {
    className: `${toneToken.base} ${toneToken.cheap}`,
    ...variantToken,
  }
}

export function getBackdropStyle (token: GlassShellToken): CSSProperties {
  return {
    backdropFilter: `blur(${token.blurPx}px) saturate(${token.saturate}%)`,
    WebkitBackdropFilter: `blur(${token.blurPx}px) saturate(${token.saturate}%)`,
    boxShadow: token.shadow,
  }
}
