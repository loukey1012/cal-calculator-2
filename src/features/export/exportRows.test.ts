import { describe, expect, test } from 'vitest'
import { DAY_HEADER, dayRows, FOOD_HEADER, foodRows, type ExportData } from './exportRows'

const NUTRIENTS = {
  protein: 1,
  carbs: null,
  sugar: null,
  fat: 80,
  sat_fat: 50,
  fiber: null,
  salt: 0.02,
}

const DATA: ExportData = {
  people: [
    { id: 'u1', name: 'Lukas' },
    { id: 'u2', name: 'Anna' },
  ],
  meals: [
    {
      user_id: 'u2',
      date: '2026-10-02',
      meal_type: 'dinner',
      meal_items: [
        {
          name: 'Pasta',
          brand: null,
          entered_amount: 150,
          entered_unit: 'g',
          basis_multiplier: 1.5,
          kcal: 350,
          ...NUTRIENTS,
          protein: 12.33,
          estimated: true,
        },
      ],
    },
    {
      user_id: 'u1',
      date: '2026-10-02',
      meal_type: 'breakfast',
      meal_items: [
        {
          name: 'Butter',
          brand: 'Kerrygold',
          entered_amount: 10,
          entered_unit: 'g',
          basis_multiplier: 0.1,
          kcal: 740,
          ...NUTRIENTS,
          estimated: false,
        },
        {
          name: 'Egg',
          brand: null,
          entered_amount: 2,
          entered_unit: 'unit',
          basis_multiplier: 2,
          kcal: 78,
          ...NUTRIENTS,
          estimated: false,
        },
      ],
    },
  ],
  days: [
    {
      user_id: 'u1',
      date: '2026-10-02',
      kcal: 230,
      ...NUTRIENTS,
      kcal_estimated: false,
    },
  ],
  weights: [
    { user_id: 'u1', date: '2026-10-02', weight_kg: 81.4 },
    { user_id: 'u2', date: '2026-10-03', weight_kg: 63 },
  ],
}

describe('foodRows', () => {
  test('one row per food, its totals for the amount eaten, nutrients in label order', () => {
    expect(FOOD_HEADER).toEqual([
      'Person',
      'Date',
      'Meal',
      'Food',
      'Brand',
      'Amount',
      'Unit',
      'kcal',
      'Fat (g)',
      'Saturated fat (g)',
      'Carbs (g)',
      'Sugar (g)',
      'Fiber (g)',
      'Protein (g)',
      'Salt (g)',
      'Estimate',
    ])
    expect(foodRows(DATA)).toEqual([
      // by date, then person (as listed), then meal of the day
      [
        'Lukas',
        '2026-10-02',
        'Breakfast',
        'Butter',
        'Kerrygold',
        10,
        'g',
        74,
        8,
        5,
        null,
        null,
        null,
        0.1,
        0,
        false,
      ],
      [
        'Lukas',
        '2026-10-02',
        'Breakfast',
        'Egg',
        null,
        2,
        'pieces',
        156,
        160,
        100,
        null,
        null,
        null,
        2,
        0,
        false,
      ],
      [
        'Anna',
        '2026-10-02',
        'Dinner',
        'Pasta',
        null,
        150,
        'g',
        525,
        120,
        75,
        null,
        null,
        null,
        18.5,
        0,
        true,
      ],
    ])
  })
})

describe('dayRows', () => {
  test('each person’s day totals and weight; a day with only a weight is listed too', () => {
    expect(DAY_HEADER).toEqual([
      'Person',
      'Date',
      'kcal',
      'Fat (g)',
      'Saturated fat (g)',
      'Carbs (g)',
      'Sugar (g)',
      'Fiber (g)',
      'Protein (g)',
      'Salt (g)',
      'Weight (kg)',
      'Estimate',
      'Cheat day',
      'Cheat meal',
    ])
    expect(dayRows(DATA)).toEqual([
      ['Lukas', '2026-10-02', 230, 80, 50, null, null, null, 1, 0, 81.4, false, false, false],
      [
        'Anna',
        '2026-10-03',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        63,
        false,
        false,
        false,
      ],
    ])
  })

  test('marks cheat days and days with a cheat meal', () => {
    const empty = { kcal: null, ...NUTRIENTS, kcal_estimated: false }
    const data: ExportData = {
      ...DATA,
      weights: [],
      days: [
        { user_id: 'u1', date: '2026-10-04', ...empty, cheat_day: true, cheat_meal: false },
        { user_id: 'u2', date: '2026-10-04', ...empty, kcal: 300, cheat_meal: true },
      ],
    }

    expect(dayRows(data).map((row) => [row[0], row.at(-2), row.at(-1)])).toEqual([
      ['Lukas', true, false],
      ['Anna', false, true],
    ])
  })

  test('nothing in the range: no rows', () => {
    expect(dayRows({ ...DATA, days: [], weights: [] })).toEqual([])
    expect(foodRows({ ...DATA, meals: [] })).toEqual([])
  })
})
