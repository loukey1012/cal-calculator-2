import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useAccentColor } from './useAccentColor'

const accent = () => document.documentElement.style.getPropertyValue('--accent')

describe('useAccentColor', () => {
  test('applies the profile color to the whole app and resets it on unmount', () => {
    const { rerender, unmount } = renderHook(({ color }) => useAccentColor(color), {
      initialProps: { color: '#ff2d55' },
    })
    expect(accent()).toBe('#ff2d55')

    rerender({ color: '#34c759' })
    expect(accent()).toBe('#34c759')

    unmount()
    expect(accent()).toBe('')
  })

  test('keeps the system blue (which adapts to dark mode) for the default color', () => {
    renderHook(() => useAccentColor('#007AFF'))

    expect(accent()).toBe('')
  })
})
