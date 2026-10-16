import { describe, expect, test } from 'vitest'
import { checkFindings, reviewContext, type ReviewData } from './findings'

const BUTTER = '7d3c5f8e-1b2a-4c3d-9e8f-0a1b2c3d4e5f'
const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'
const ITEM = '33333333-3333-4333-8333-333333333333'

const DATA: ReviewData = {
  ingredients: [{ id: BUTTER }],
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

    expect(checkFindings([{ ...noFix, kind: 'duplicate' }], context)[0]).toMatchObject({
      suggestion: {},
    })
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
