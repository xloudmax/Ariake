import { beforeEach, describe, expect, it, vi } from 'vitest'
import { measureInlineLabelWidth, measureMultilineClamp } from '@/utils/pretextMetrics'

describe('pretext metrics', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: (text: string) => ({ width: text.length * 7.5 }),
    } as CanvasRenderingContext2D)
  })

  it('measures multiline text height and reports overflow beyond the clamp', () => {
    const metrics = measureMultilineClamp({
      text: 'A fairly long title that should wrap into multiple lines for measurement',
      font: '700 16px Inter',
      width: 120,
      lineHeight: 24,
      maxLines: 2,
    })

    expect(metrics.lineCount).toBeGreaterThan(1)
    expect(metrics.height).toBeGreaterThan(0)
    expect(metrics.clampedHeight).toBeLessThanOrEqual(48)
    expect(metrics.isOverflowing).toBeTypeOf('boolean')
  })

  it('measures natural inline label width including chrome padding', () => {
    const shortWidth = measureInlineLabelWidth({
      text: 'AI',
      font: '600 12px Inter',
      chromeWidth: 20,
      minWidth: 0,
    })

    const longWidth = measureInlineLabelWidth({
      text: 'Artificial Intelligence',
      font: '600 12px Inter',
      chromeWidth: 20,
      minWidth: 0,
    })

    expect(shortWidth).toBeGreaterThan(0)
    expect(longWidth).toBeGreaterThan(shortWidth)
  })
})
