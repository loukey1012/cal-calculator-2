import { describe, expect, test } from 'vitest'
import { keysForHint, parseHint } from './liveEvent'

const ME = '00000000-0000-4000-8000-000000000001'
const PARTNER = '00000000-0000-4000-8000-000000000002'
const HOUSEHOLD = '00000000-0000-4000-8000-0000000000aa'
const DISH = '00000000-0000-4000-8000-0000000000d1'

describe('parseHint', () => {
  test('reads a day hint, ignoring extra fields Realtime adds', () => {
    // Act
    const hint = parseHint({
      table: 'meals',
      user_id: PARTNER,
      date: '2026-10-06',
      actor: PARTNER,
      id: 'message-id',
    })

    // Assert
    expect(hint).toEqual({ table: 'meals', user_id: PARTNER, date: '2026-10-06', actor: PARTNER })
  })

  test.each([
    ['not an object', 'hello'],
    ['an unknown table', { table: 'secrets', actor: PARTNER }],
    ['a day hint without a date', { table: 'meals', user_id: PARTNER, actor: PARTNER }],
    ['a malformed date', { table: 'meals', user_id: PARTNER, date: '6.10.', actor: PARTNER }],
    ['a dish hint without its dish', { table: 'dishes', actor: PARTNER }],
  ])('ignores %s', (_label, payload) => {
    expect(parseHint(payload)).toBeNull()
  })

  test('accepts a change made without a signed-in user (e.g. by an admin)', () => {
    expect(parseHint({ table: 'ingredients', actor: null })).toEqual({
      table: 'ingredients',
      actor: null,
    })
  })
})

describe('keysForHint', () => {
  test("a partner's day change refreshes that day and their History months", () => {
    // Act
    const keys = keysForHint(
      { table: 'meals', user_id: PARTNER, date: '2026-10-06', actor: PARTNER },
      HOUSEHOLD,
    )

    // Assert
    expect(keys).toEqual([
      ['day', PARTNER, '2026-10-06'],
      ['month', PARTNER],
    ])
  })

  test('a partner logging into my day refreshes my day', () => {
    const keys = keysForHint(
      { table: 'meals', user_id: ME, date: '2026-10-06', actor: PARTNER },
      HOUSEHOLD,
    )

    expect(keys).toContainEqual(['day', ME, '2026-10-06'])
  })

  test('a dish change refreshes the dish and the leftovers', () => {
    const keys = keysForHint({ table: 'dishes', dish_id: DISH, actor: PARTNER }, HOUSEHOLD)

    expect(keys).toEqual([['dish', DISH], ['leftovers']])
  })

  test.each(['ingredients', 'categories', 'category_groups'] as const)(
    'a change to %s refreshes the whole ingredient database',
    (table) => {
      const keys = keysForHint({ table, actor: PARTNER }, HOUSEHOLD)

      expect(keys).toEqual([
        ['ingredients', HOUSEHOLD],
        ['categories', HOUSEHOLD],
        ['categoryGroups', HOUSEHOLD],
      ])
    },
  )

  test("a partner's new goal refreshes their goals", () => {
    const keys = keysForHint({ table: 'goal_history', user_id: PARTNER, actor: PARTNER }, HOUSEHOLD)

    expect(keys).toEqual([['goals', PARTNER]])
  })

  test('a profile change refreshes that profile and the member list', () => {
    const keys = keysForHint({ table: 'profiles', user_id: PARTNER, actor: PARTNER }, HOUSEHOLD)

    expect(keys).toEqual([
      ['profile', PARTNER],
      ['members', HOUSEHOLD],
    ])
  })

  test('a household change refreshes the household and its members', () => {
    const keys = keysForHint({ table: 'households', actor: PARTNER }, HOUSEHOLD)

    expect(keys).toEqual([
      ['household', HOUSEHOLD],
      ['members', HOUSEHOLD],
    ])
  })
})
