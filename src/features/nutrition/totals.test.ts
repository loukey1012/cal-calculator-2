import { describe, expect, test } from 'vitest'
import { EMPTY_TOTALS, itemTotals, mealTotals, sumTotals } from './totals'
import { values } from './testData'

const CREAM_150G = { basis_multiplier: 1.5, ...values(92, { protein: 1.3, fat: 7 }) }
const CUSTOM_SNACK_2 = { basis_multiplier: 2, ...values(200) }

describe('itemTotals', () => {
  test('multiplies the snapshot by the basis multiplier', () => {
    const totals = itemTotals(CREAM_150G)

    expect(totals.kcal).toBe(138)
    expect(totals.protein).toBeCloseTo(1.95)
    expect(totals.fat).toBeCloseTo(10.5)
  })

  test('unknown nutrients count as 0 and are flagged as missing', () => {
    const totals = itemTotals(CREAM_150G)

    expect(totals.carbs).toBe(0)
    expect(totals.missing).toEqual(['carbs', 'sugar', 'sat_fat', 'fiber', 'salt'])
  })
})

describe('mealTotals / sumTotals', () => {
  test('sums items and unions the missing flags (same as the meal_totals view)', () => {
    const totals = mealTotals([CREAM_150G, CUSTOM_SNACK_2])

    expect(totals.kcal).toBe(538)
    expect(totals.protein).toBeCloseTo(1.95)
    expect(totals.missing).toEqual(['protein', 'carbs', 'sugar', 'fat', 'sat_fat', 'fiber', 'salt'])
  })

  test('an empty meal totals zero with nothing missing', () => {
    expect(mealTotals([])).toEqual(EMPTY_TOTALS)
    expect(EMPTY_TOTALS).toMatchObject({ kcal: 0, protein: 0, missing: [] })
  })

  test('day totals are the sum of meal totals', () => {
    const lunch = mealTotals([CREAM_150G])
    const dinner = mealTotals([
      {
        basis_multiplier: 1,
        ...values(500, {
          protein: 30,
          carbs: 40,
          sugar: 5,
          fat: 20,
          sat_fat: 8,
          fiber: 6,
          salt: 1.2,
        }),
      },
    ])

    const day = sumTotals([lunch, dinner])

    expect(day.kcal).toBe(638)
    expect(day.protein).toBeCloseTo(31.95)
    expect(day.missing).toEqual(['carbs', 'sugar', 'sat_fat', 'fiber', 'salt'])
  })
})
