import { describe, expect, test } from 'vitest'
import { cookLink, parseCookLink } from './cookLink'

const TODAY = '2026-10-06'

describe('cook links', () => {
  test('a link from an empty meal opens Cook with that person, day and meal', () => {
    // Arrange
    const link = cookLink({ userId: 'u2', date: '2026-10-04', mealType: 'dinner' }, '/history')

    // Act
    const parsed = parseCookLink(new URL(link, 'https://app.test').searchParams, TODAY)

    // Assert
    expect(link.startsWith('/cook?')).toBe(true)
    expect(parsed).toEqual({
      prefill: { userId: 'u2', date: '2026-10-04', mealType: 'dinner' },
      returnTo: '/history',
    })
  })

  test('a link from a day in History returns to that day', () => {
    const params = new URLSearchParams({
      person: 'u1',
      date: '2026-10-04',
      meal: 'lunch',
      from: '/history/2026-10-04',
    })
    expect(parseCookLink(params, TODAY)?.returnTo).toBe('/history/2026-10-04')
  })

  test('without a known origin it goes back to Today', () => {
    const params = new URLSearchParams({
      person: 'u1',
      date: TODAY,
      meal: 'lunch',
      from: 'https://evil.example/today',
    })
    expect(parseCookLink(params, TODAY)?.returnTo).toBe('/today')
  })

  test.each([
    ['nothing', {}],
    ['no person', { date: TODAY, meal: 'lunch' }],
    ['a broken day', { person: 'u1', date: '6.10.2026', meal: 'lunch' }],
    ['a future day', { person: 'u1', date: '2026-10-07', meal: 'lunch' }],
    ['an unknown meal', { person: 'u1', date: TODAY, meal: 'brunch' }],
  ])('a link with %s is ignored', (_reason, values) => {
    expect(parseCookLink(new URLSearchParams(values), TODAY)).toBeNull()
  })
})
