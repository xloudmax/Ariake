import { describe, expect, it } from 'vitest'
import { lightTheme, darkTheme } from '@/theme/themeConfigs'

describe('themeConfigs Tag tokens', () => {
  it('keeps light tags on a light surface', () => {
    expect(lightTheme.components?.Tag).toMatchObject({
      defaultBg: 'rgba(255, 255, 255, 0.92)',
      defaultColor: 'var(--surface-text)',
    })
  })

  it('keeps dark tags on a dark surface', () => {
    expect(darkTheme.components?.Tag).toMatchObject({
      defaultBg: 'rgba(15, 23, 42, 0.76)',
      defaultColor: 'var(--surface-text)',
    })
  })
})
