import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { parseAppearance } from './appearance'
import { useGlassField } from './useGlassField'

const root = document.documentElement
const variable = (name: string) => root.style.getPropertyValue(name)

const SPOTS = [
  { color: '#123456', x: 0.2, y: 0.3, size: 0.4 },
  { color: '#abcdef', x: 0.7, y: 0.6, size: 0.8 },
]

afterEach(() => {
  root.removeAttribute('style')
  delete root.dataset.glassDrift
})

function render(glassField: object, glass = 'all', tab = 0, progress: number | null = null) {
  return renderHook(
    ({ tab: index }) => useGlassField(parseAppearance({ glass, glassField }), index, progress),
    { initialProps: { tab } },
  )
}

describe('useGlassField', () => {
  test('paints the custom spots and their strength with Liquid Glass Full', () => {
    render({ mode: 'custom', spots: SPOTS, strength: 0.6 })

    expect(variable('--gf-c1')).toBe('#123456')
    expect(variable('--gf-x2')).toBe('70%')
    expect(variable('--gf-c3')).toBe('transparent')
    expect(variable('--glass-field-strength')).toBe('60%')
  })

  test('the style mode follows the style’s own ring colors', () => {
    render({ mode: 'style' })

    expect(variable('--gf-c1')).toBe('var(--goal-kcal)')
  })

  test('nothing is painted without Full', () => {
    render({ mode: 'custom', spots: SPOTS }, 'controls')

    expect(variable('--gf-c1')).toBe('')
  })

  test('random changes on every tab change, unless it should change once per start', () => {
    const everyTab = render({ mode: 'random', changeOn: 'tab' })
    const before = variable('--gf-c1')
    everyTab.rerender({ tab: 1 })
    expect(variable('--gf-c1')).not.toBe(before)
    everyTab.unmount()

    const perStart = render({ mode: 'random', changeOn: 'start' })
    const first = variable('--gf-c1')
    perStart.rerender({ tab: 2 })
    expect(variable('--gf-c1')).toBe(first)
  })

  test('drift is switched on with the field, and everything is removed when signed out', () => {
    const { unmount } = render({ mode: 'custom', spots: SPOTS, drift: true })
    expect(root.dataset.glassDrift).toBe('on')

    unmount()
    expect(root.dataset.glassDrift).toBeUndefined()
    expect(variable('--gf-c1')).toBe('')
  })

  test('goal-aware uses today’s progress', () => {
    const early = render({ mode: 'goal' }, 'all', 0, 0.1)
    const calm = variable('--gf-c1')
    early.unmount()

    render({ mode: 'goal' }, 'all', 0, 1.4)
    expect(variable('--gf-c1')).not.toBe(calm)
  })
})
