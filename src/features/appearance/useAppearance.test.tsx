import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { APPEARANCE_CACHE_KEY } from '../../lib/persistence'
import { useAppearance } from './useAppearance'

const root = document.documentElement
const variable = (name: string) => root.style.getPropertyValue(name)

const touchIcon = () => document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')

beforeEach(() => {
  document.head.innerHTML = '<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />'
})

afterEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
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

  test('applies the Liquid Glass choice to the whole app and remembers it for the next start', () => {
    const { rerender, unmount } = renderHook(
      ({ glass }) => useAppearance({ accent_color: '#007aff', appearance: { glass } }),
      { initialProps: { glass: 'controls' } },
    )
    expect(root.dataset.glass).toBe('controls')
    const cache = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null')
    expect(cache).toMatchObject({ glass: 'controls' })

    rerender({ glass: 'all' })
    expect(root.dataset.glass).toBe('all')

    unmount()
    expect(root.dataset.glass).toBeUndefined()
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

  test('paints custom goal colors over the palette', () => {
    renderHook(() =>
      useAppearance({
        accent_color: '#007aff',
        appearance: { goalPalette: 'vivid', customGoalColors: { fat: '#9466d6' } },
      }),
    )

    expect(variable('--goal-fat')).toBe('#9466d6')
  })

  test('stored custom colors are not painted while the flag is off', () => {
    renderHook(() =>
      useAppearance({
        accent_color: '#007aff',
        appearance: {
          goalPalette: 'vivid',
          customGoalColors: { fat: '#9466d6' },
          customGoalColorsOn: false,
        },
      }),
    )

    expect(variable('--goal-fat')).not.toBe('#9466d6')
  })

  test('repaints the ring colors when the custom flag flips', () => {
    const { rerender } = renderHook(
      ({ on }) =>
        useAppearance({
          accent_color: '#007aff',
          appearance: {
            goalPalette: 'vivid',
            customGoalColors: { fat: '#9466d6' },
            customGoalColorsOn: on,
          },
        }),
      { initialProps: { on: true } },
    )
    expect(variable('--goal-fat')).toBe('#9466d6')

    rerender({ on: false })
    expect(variable('--goal-fat')).not.toBe('#9466d6')

    rerender({ on: true })
    expect(variable('--goal-fat')).toBe('#9466d6')
  })

  test('mirrors the look to localStorage for the next app start', () => {
    renderHook(() =>
      useAppearance({ accent_color: '#007aff', appearance: { theme: 'dark', darkStyle: 'bento' } }),
    )

    const cache = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null')
    expect(cache).toMatchObject({ theme: 'dark', darkStyle: 'bento' })
    expect(cache.variables['--accent']).toBe('#007aff')
  })

  test('uses the account’s app icon and goes back to the default when signed out', () => {
    const { rerender, unmount } = renderHook(
      ({ appIcon }) => useAppearance({ accent_color: '#007aff', appearance: { appIcon } }),
      { initialProps: { appIcon: 'violet' } },
    )
    expect(touchIcon()).toBe('/icons/violet/apple-touch-icon-180x180.png')

    rerender({ appIcon: 'leaf' })
    expect(touchIcon()).toBe('/icons/leaf/apple-touch-icon-180x180.png')

    unmount()
    expect(touchIcon()).toBe('/icons/graphite/apple-touch-icon-180x180.png')
  })

  test('mirrors the app icon to localStorage for the next app start', () => {
    renderHook(() => useAppearance({ accent_color: '#007aff', appearance: { appIcon: 'pink' } }))

    const cache = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null')
    expect(cache).toMatchObject({ appIcon: 'pink' })
  })
})
