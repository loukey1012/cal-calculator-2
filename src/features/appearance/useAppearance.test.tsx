import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { APPEARANCE_CACHE_KEY } from '../../lib/persistence'
import { useAppearance } from './useAppearance'

const root = document.documentElement
const variable = (name: string) => root.style.getPropertyValue(name)

afterEach(() => {
  localStorage.clear()
})

describe('useAppearance', () => {
  test('paints the app in the profile’s scheme, accent and goal colors', () => {
    renderHook(() =>
      useAppearance({
        accent_color: '#C6F432',
        appearance: { theme: 'dark', darkStyle: 'bento', goalPalette: 'accent' },
      }),
    )

    expect(root.dataset.scheme).toBe('bento')
    expect(variable('--accent')).toBe('#c6f432')
    expect(variable('--on-accent')).toBe('#0c0c0d')
    expect(variable('--goal-kcal')).toBe('#c6f432')
  })

  test('follows changes and resets to the device look when signed out', () => {
    const { rerender, unmount } = renderHook(
      ({ theme }) => useAppearance({ accent_color: '#007aff', appearance: { theme } }),
      { initialProps: { theme: 'dark' } },
    )
    expect(root.dataset.scheme).toBe('soft')

    rerender({ theme: 'light' })
    expect(root.dataset.scheme).toBe('light')

    unmount()
    expect(root.dataset.scheme).toBe('light')
    expect(variable('--accent')).toBe('')
  })

  test('paints the pink light style', () => {
    renderHook(() =>
      useAppearance({
        accent_color: '#d6409f',
        appearance: { theme: 'light', lightStyle: 'pink' },
      }),
    )

    expect(root.dataset.scheme).toBe('pink')
    const cache = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null')
    expect(cache).toMatchObject({ theme: 'light', lightStyle: 'pink' })
  })

  test('mirrors the look to localStorage for the next app start', () => {
    renderHook(() =>
      useAppearance({ accent_color: '#007aff', appearance: { theme: 'dark', darkStyle: 'bento' } }),
    )

    const cache = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null')
    expect(cache).toMatchObject({ theme: 'dark', darkStyle: 'bento' })
    expect(cache.variables['--accent']).toBe('#007aff')
  })
})
