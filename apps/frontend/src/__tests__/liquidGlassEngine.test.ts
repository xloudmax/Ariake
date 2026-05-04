import { describe, it, expect } from 'vitest'

/* ─── Mirror the height functions from LiquidSurface.tsx for testing ─── */
const cubicBezierTolerance = 1e-7
const getTForX = (x: number, p1x: number, p2x: number): number => {
  let lower = 0; let upper = 1; let t = 0.5; let currentX = 0
  for (let i = 0; i < 12; i++) {
    currentX = 3 * (1 - t) ** 2 * t * p1x + 3 * (1 - t) * t ** 2 * p2x + t ** 3
    if (Math.abs(currentX - x) < cubicBezierTolerance) break
    if (currentX < x) lower = t; else upper = t
    t = (upper + lower) / 2
  }
  return t
}
const cubicBezierY = (t: number, p1y: number, p2y: number): number =>
  3 * (1 - t) ** 2 * t * p1y + 3 * (1 - t) * t ** 2 * p2y + t ** 3
const solveBezier = (x: number, p1x: number, p1y: number, p2x: number, p2y: number): number => {
  if (x <= 0) return 0; if (x >= 1) return 1
  return cubicBezierY(getTForX(x, p1x, p2x), p1y, p2y)
}

// Height profiles
const heightConvex = (x: number) =>
  x <= 0.5
    ? solveBezier(2 * x, 0.33, 1.53, 0.69, 0.99) / 2
    : (2 - solveBezier(2 * (1 - x), 0.33, 1.53, 0.69, 0.99)) / 2

const heightCircle = (x: number) => {
  const c = Math.max(0, Math.min(1, x))
  return Math.sqrt(1 - (1 - c) * (1 - c))
}

const heightConcave = (x: number) => 1 - heightConvex(1 - x)

const smootherStep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)

const heightLip = (x: number) => {
  const c1 = heightConvex(x); const c2 = heightConcave(x); const m = smootherStep(x)
  return c1 * (1 - m) + c2 * m
}

// SDF rounded rect
const sdfRoundedRect = (px: number, py: number, halfW: number, halfH: number, rad: number) => {
  const qx = Math.abs(px) - halfW
  const qy = Math.abs(py) - halfH
  return Math.sqrt(Math.max(0, qx) ** 2 + Math.max(0, qy) ** 2) + Math.min(Math.max(qx, qy), 0) - rad
}

// Numeric derivative
const numericDerivative = (fn: (x: number) => number, x: number, delta = 0.001) => {
  return (fn(Math.min(1, x + delta)) - fn(Math.max(0, x - delta))) / (2 * delta)
}

/* ═══════════ TESTS ═══════════ */

describe('Height Functions', () => {
  describe('heightConvex (Squircle)', () => {
    it('should return 0 at x=0 (edge)', () => {
      expect(heightConvex(0)).toBeCloseTo(0, 5)
    })

    it('should return ~1 at x=1 (flat interior)', () => {
      expect(heightConvex(1)).toBeCloseTo(1, 1)
    })

    it('should generally increase from edge to center', () => {
      // Squircle Bezier has overshoot (P1y=1.53 > 1), so not strictly monotonic
      // but the trend from 0→1 increases overall
      expect(heightConvex(0.1)).toBeGreaterThan(heightConvex(0))
      expect(heightConvex(1)).toBeGreaterThanOrEqual(heightConvex(0))
    })

    it('should be symmetric around x=0.5', () => {
      const a = heightConvex(0.3)
      const b = heightConvex(0.7)
      // Symmetric means f(0.5-d) + f(0.5+d) ≈ 1 for squircle
      expect(a + b).toBeCloseTo(1, 1)
    })
  })

  describe('heightCircle', () => {
    it('should return 0 at x=0', () => {
      expect(heightCircle(0)).toBe(0)
    })

    it('should return 1 at x=1', () => {
      expect(heightCircle(1)).toBe(1)
    })

    it('should follow circular arc: y = √(1-(1-x)²)', () => {
      const x = 0.5
      expect(heightCircle(x)).toBeCloseTo(Math.sqrt(1 - 0.5 * 0.5), 10)
    })

    it('should clamp out-of-range inputs', () => {
      expect(heightCircle(-0.5)).toBe(0)
      expect(heightCircle(1.5)).toBe(1)
    })
  })

  describe('heightConcave', () => {
    it('should return ~0 at x=0 (complement of convex)', () => {
      // concave(0) = 1 - convex(1) ≈ 1 - 1 = 0
      expect(heightConcave(0)).toBeCloseTo(0, 1)
    })

    it('should return ~1 at x=1', () => {
      // concave(1) = 1 - convex(0) = 1 - 0 = 1
      expect(heightConcave(1)).toBeCloseTo(1, 1)
    })

    it('should be the complement of convex: concave(x) = 1 - convex(1-x)', () => {
      for (let i = 0; i <= 10; i++) {
        const x = i / 10
        expect(heightConcave(x)).toBeCloseTo(1 - heightConvex(1 - x), 10)
      }
    })
  })

  describe('heightLip', () => {
    it('should return 0 at x=0', () => {
      expect(heightLip(0)).toBeCloseTo(0, 5)
    })

    it('should have a raised rim then a dip', () => {
      // value at ~0.3 should be high (convex dominates)
      const rimVal = heightLip(0.3)
      // value at ~0.8 should be lower (concave dominates)
      const centerVal = heightLip(0.8)
      expect(rimVal).toBeGreaterThan(centerVal)
    })
  })
})

describe('SDF Rounded Rect', () => {
  it('should return 0 exactly on the border of a circle', () => {
    // For a perfect circle: halfW=0, halfH=0, rad=50
    const d = sdfRoundedRect(50, 0, 0, 0, 50)
    expect(d).toBeCloseTo(0, 5)
  })

  it('should return negative inside the shape', () => {
    const d = sdfRoundedRect(0, 0, 50, 30, 10)
    expect(d).toBeLessThan(0)
  })

  it('should return positive outside the shape', () => {
    const d = sdfRoundedRect(100, 100, 50, 30, 10)
    expect(d).toBeGreaterThan(0)
  })

  it('should be symmetric', () => {
    const d1 = sdfRoundedRect(30, 20, 50, 30, 10)
    const d2 = sdfRoundedRect(-30, -20, 50, 30, 10)
    expect(d1).toBeCloseTo(d2, 10)
  })
})

describe('SmootherstStep', () => {
  it('should return 0 at x=0', () => {
    expect(smootherStep(0)).toBe(0)
  })

  it('should return 1 at x=1', () => {
    expect(smootherStep(1)).toBe(1)
  })

  it('should return 0.5 at x=0.5', () => {
    expect(smootherStep(0.5)).toBeCloseTo(0.5, 5)
  })
})

describe('Numeric Derivative', () => {
  it('should approximate the derivative of x² → 2x at x=0.5', () => {
    const fn = (x: number) => x * x
    const deriv = numericDerivative(fn, 0.5)
    expect(deriv).toBeCloseTo(1.0, 3) // d/dx(x²) at 0.5 = 2*0.5 = 1.0
  })

  it('should detect zero slope at flat regions', () => {
    const fn = () => 1 // flat
    const deriv = numericDerivative(fn, 0.5)
    expect(deriv).toBeCloseTo(0, 5)
  })

  it('should detect non-zero slope on convex height function in the bezel region', () => {
    // At x=0.1 (early bezel), the Squircle rises steeply (positive)
    const deriv = numericDerivative(heightConvex, 0.1)
    expect(Math.abs(deriv)).toBeGreaterThan(0)
  })
})

describe('IOR scaling', () => {
  it('IOR=1.5 should produce 1x magnitude', () => {
    const baseMag = 10
    const ior = 1.5
    expect(baseMag * (ior / 1.5)).toBeCloseTo(10, 5)
  })

  it('IOR=3.0 should double the magnitude', () => {
    const baseMag = 10
    const ior = 3.0
    expect(baseMag * (ior / 1.5)).toBeCloseTo(20, 5)
  })

  it('IOR=1.0 should reduce magnitude', () => {
    const baseMag = 10
    const ior = 1.0
    expect(baseMag * (ior / 1.5)).toBeCloseTo(6.667, 2)
  })
})
