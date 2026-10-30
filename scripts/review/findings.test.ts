import { describe, expect, test } from 'vitest'
import { checkFindings, checkWithdrawals, reviewContext, type ReviewData } from './findings'

const BUTTER = '7d3c5f8e-1b2a-4c3d-9e8f-0a1b2c3d4e5f'
const OTHER_BUTTER = '8e4d6a9f-2c3b-4d4e-8f9a-1b2c3d4e5f6a'
const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const ITEM = '33333333-3333-4333-8333-333333333333'

const DATA: ReviewData = {
  ingredients: [{ id: BUTTER }, { id: OTHER_BUTTER }],
  meals: {
    from: '2026-10-04',
    to: '2026-10-10',
    members: [{ id: ALICE }, { id: BOB }],
    meals: [{ user_id: ALICE, date: '2026-10-09', items: [{ id: ITEM }] }],
  },
}
const context = reviewContext(DATA)

const TYPO = {
  ingredient_id: BUTTER,
  kind: 'typo',
  message: 'The name looks misspelled.',
  suggestion: { name: 'Butter' },
}
const NO_LUNCH = {
  user_id: ALICE,
  date: '2026-10-09',
  meal_type: 'lunch',
  kind: 'missing_meal',
  message: 'Breakfast and dinner are logged, but no lunch.',
}

describe('checkFindings', () => {
  test('passes valid ingredient and day findings through', () => {
    const odd = { ...NO_LUNCH, meal_type: 'breakfast', meal_item_id: ITEM, kind: 'odd_amount' }

    expect(checkFindings([TYPO, NO_LUNCH, odd], context)).toEqual([TYPO, NO_LUNCH, odd])
  })

  test('an ingredient finding without a fix gets an empty one', () => {
    const { suggestion: _, ...noFix } = TYPO

    expect(checkFindings([{ ...noFix, kind: 'other' }], context)[0]).toMatchObject({
      suggestion: {},
    })
  })

  test('a duplicate names the other ingredient of the household', () => {
    const duplicate = {
      ...TYPO,
      kind: 'duplicate',
      message: 'Same as "Butter" (Kerrygold).',
      suggestion: { duplicate_of: OTHER_BUTTER },
    }
    const problem = 'a duplicate’s suggestion is { "duplicate_of": "<id of the other ingredient>" }'

    expect(checkFindings([duplicate], context)).toEqual([duplicate])
    expect(() =>
      checkFindings(
        [
          { ...duplicate, suggestion: {} },
          { ...duplicate, suggestion: { duplicate_of: BUTTER } },
          { ...duplicate, suggestion: { duplicate_of: 'not-ours' } },
        ],
        context,
      ),
    ).toThrow([`#1: ${problem}`, `#2: ${problem}`, `#3: ${problem}`].join('\n'))
  })

  test('lists every problem with an ingredient finding at once, by position', () => {
    expect(() =>
      checkFindings(
        [
          { ...TYPO, ingredient_id: 'not-ours' },
          { ...TYPO, kind: 'spelling' },
          { ...TYPO, message: '' },
          { ...TYPO, suggestion: { household_id: 'x' } },
          { ...TYPO, suggestion: { kcal_100: { a: 1 } } },
        ],
        context,
      ),
    ).toThrow(
      [
        '#1: ingredient_id is not one of the household’s ingredients',
        '#2: kind must be one of typo, brand, unit_name, unit_weight, duplicate, values, other',
        '#3: message must be 1–500 characters',
        '#4: suggestion field household_id can’t be changed',
        '#5: suggestion value for kcal_100 must be text, a number or null',
      ].join('\n'),
    )
  })

  test('lists every problem with a day finding', () => {
    expect(() =>
      checkFindings(
        [
          { ...NO_LUNCH, user_id: 'someone-else' },
          { ...NO_LUNCH, date: '2026-10-11' },
          { ...NO_LUNCH, meal_type: 'brunch' },
          { ...NO_LUNCH, kind: 'typo' },
          { ...NO_LUNCH, meal_item_id: ITEM, date: '2026-10-08' },
          { ...NO_LUNCH, suggestion: { kcal: 1 } },
        ],
        context,
      ),
    ).toThrow(
      [
        '#1: user_id is not a member of the household',
        '#2: date must be a reviewed day, 2026-10-04 to 2026-10-10',
        '#3: meal_type must be one of breakfast, lunch, dinner, snack',
        '#4: kind must be one of missing_meal, low_day, odd_amount, double_entry, zero_kcal',
        '#5: meal_item_id is not an item of that person on that day',
        '#6: a day finding has no suggestion',
      ].join('\n'),
    )
  })

  test('a finding is about an ingredient or a day, never both or neither', () => {
    expect(() => checkFindings([{ ...TYPO, user_id: ALICE }], context)).toThrow(
      '#1: give either ingredient_id or user_id and date',
    )
    expect(() => checkFindings([{ kind: 'other', message: 'Hm.' }], context)).toThrow(
      '#1: give either ingredient_id or user_id and date',
    )
  })

  test('takes a list of at most 100', () => {
    expect(() => checkFindings({ findings: [] }, context)).toThrow('a list')
    expect(() =>
      checkFindings(
        Array.from({ length: 101 }, () => TYPO),
        context,
      ),
    ).toThrow('100')
  })

  test('without fetched meals, no day finding passes', () => {
    const ingredientsOnly = reviewContext({ ingredients: [{ id: BUTTER }] })

    expect(() => checkFindings([NO_LUNCH], ingredientsOnly)).toThrow('not a member')
  })
})

describe('checkWithdrawals', () => {
  test('passes a list of unique ids, an empty one too', () => {
    expect(checkWithdrawals([BUTTER, ALICE])).toEqual([BUTTER, ALICE])
    expect(checkWithdrawals([])).toEqual([])
  })

  test('refuses anything but a list', () => {
    expect(() => checkWithdrawals({ ids: [BUTTER] })).toThrow('a list')
    expect(() => checkWithdrawals(null)).toThrow('a list')
  })

  test('lists every entry that is not an id', () => {
    expect(() => checkWithdrawals([BUTTER, 'nope', 5, null])).toThrow(/#2.*\n#3.*\n#4/)
  })

  test('refuses a repeated id', () => {
    expect(() => checkWithdrawals([BUTTER, ALICE, BUTTER])).toThrow('#3: repeated')
  })

  test('allows 200 ids and refuses 201', () => {
    const ids = (count: number) =>
      Array.from(
        { length: count },
        (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      )

    expect(checkWithdrawals(ids(200))).toHaveLength(200)
    expect(() => checkWithdrawals(ids(201))).toThrow('200')
  })
})
