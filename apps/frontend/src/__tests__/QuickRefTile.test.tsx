import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuickRefTile from '@/components/QuickRefTile'

vi.mock('@/hooks/usePretextMetrics', () => ({
  usePretextClamp: () => ({
    ref: { current: null },
    clampedHeight: 56,
    isOverflowing: true,
    lineCount: 3,
  }),
}))

describe('QuickRefTile', () => {
  it('uses pretext metrics to stabilize title height', () => {
    render(<QuickRefTile title='A very long quick reference title' onClick={vi.fn()} />)

    const title = screen.getByText('A very long quick reference title')
    expect(title).toBeInTheDocument()
    expect(title).toHaveStyle({ minHeight: '56px' })
  })
})
