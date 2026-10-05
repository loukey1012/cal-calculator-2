import { describe, expect, test } from 'vitest'
import {
  mealEntries,
  describeAmount,
  itemsByMeal,
  MEAL_TYPES,
  scaleItemAmount,
  withItemAdded,
  withItemRemoved,
  withItemUpdated,
} from './dayModel'
import { dayMeal, mealItem } from './testData'

const CREAM = mealItem({
  id: 'cream',
  meal_id: 'lunch',
  entered_amount: 150,
  basis_multiplier: 1.5,
})
const BAR = mealItem({
  id: 'bar',
  meal_id: 'lunch',
  entered_amount: 45,
  entered_unit: 'g',
  basis: 'per_unit',
  basis_multiplier: 0.75,
  kcal: 210,
})
const DAY = [dayMeal('lunch', 'lunch', [CREAM, BAR])]

describe('MEAL_TYPES', () => {
  test('lists the four meals of a day in order with their labels', () => {
    expect(MEAL_TYPES.map((meal) => meal.label)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks'])
  })
})

describe('itemsByMeal', () => {
  test('gives every meal type its items, empty when nothing is logged', () => {
    const grouped = itemsByMeal(DAY)

    expect(grouped.lunch).toEqual([CREAM, BAR])
    expect(grouped.breakfast).toEqual([])
    expect(grouped.snack).toEqual([])
  })
})

describe('mealEntries', () => {
  test('plain items stay single, a dish’s items become one entry where the dish starts', () => {
    const apple = mealItem({ id: 'apple' })
    const mince = mealItem({ id: 'mince', dish_portion_id: 'p1', dish_line_id: 'l1' })
    const beans = mealItem({ id: 'beans', dish_portion_id: 'p1', dish_line_id: 'l2' })
    const bread = mealItem({ id: 'bread' })

    const entries = mealEntries([apple, mince, bread, beans])

    expect(entries).toEqual([
      { kind: 'item', item: apple },
      { kind: 'dish', portionId: 'p1', items: [mince, beans] },
      { kind: 'item', item: bread },
    ])
  })
})

describe('scaleItemAmount', () => {
  test('rescales the multiplier proportionally, whatever the basis', () => {
    expect(scaleItemAmount(CREAM, 200)).toEqual({ entered_amount: 200, basis_multiplier: 2 })
    // 60 g of a 60 g bar (45 g was 0.75 bars) = 1 bar
    expect(scaleItemAmount(BAR, 60)).toEqual({ entered_amount: 60, basis_multiplier: 1 })
  })

  test('rounds the amount before scaling, so amount and multiplier always agree', () => {
    const unitItem = mealItem({ entered_amount: 1, entered_unit: 'unit', basis_multiplier: 1 })

    expect(scaleItemAmount(unitItem, 0.333)).toEqual({
      entered_amount: 0.33,
      basis_multiplier: 0.33,
    })
  })

  test('rejects amounts that are not positive or too small to store', () => {
    expect(() => scaleItemAmount(CREAM, 0)).toThrow(RangeError)
    expect(() => scaleItemAmount(CREAM, 0.001)).toThrow('too small')
  })
})

describe('describeAmount', () => {
  test('shows grams or units with up to two decimals', () => {
    expect(describeAmount(CREAM, 'en')).toBe('150 g')
    expect(describeAmount(mealItem({ entered_amount: 1, entered_unit: 'unit' }), 'en')).toBe(
      '1 unit',
    )
    expect(describeAmount(mealItem({ entered_amount: 2.5, entered_unit: 'unit' }), 'de')).toBe(
      '2,5 units',
    )
  })
})

describe('optimistic cache updates', () => {
  test('withItemAdded appends to an existing meal without mutating the input', () => {
    const added = mealItem({ id: 'new' })

    const next = withItemAdded(DAY, 'lunch', added)

    expect(next[0]?.meal_items.map((item) => item.id)).toEqual(['cream', 'bar', 'new'])
    expect(DAY[0]?.meal_items).toHaveLength(2)
  })

  test('withItemAdded creates a pending meal when the meal does not exist yet', () => {
    const next = withItemAdded(DAY, 'dinner', mealItem({ id: 'soup' }))

    expect(next.find((meal) => meal.meal_type === 'dinner')).toMatchObject({
      id: 'pending-dinner',
      meal_items: [{ id: 'soup', meal_id: 'pending-dinner' }],
    })
  })

  test('withItemUpdated patches one item', () => {
    const next = withItemUpdated(DAY, 'cream', { entered_amount: 200, basis_multiplier: 2 })

    expect(next[0]?.meal_items[0]).toMatchObject({ entered_amount: 200, basis_multiplier: 2 })
    expect(next[0]?.meal_items[1]).toBe(BAR)
  })

  test('withItemRemoved drops one item', () => {
    expect(withItemRemoved(DAY, 'cream')[0]?.meal_items).toEqual([BAR])
  })
})
