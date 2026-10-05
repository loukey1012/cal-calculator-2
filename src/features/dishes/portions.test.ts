import { describe, expect, test } from 'vitest'
import type { MealItemSource } from '../nutrition/fromIngredient'
import { values } from '../nutrition/testData'
import {
  buildDishLine,
  portionItems,
  portionShares,
  type Dish,
  type DishPortion,
  type Eater,
  type PortionItems,
} from './portions'

const ME: Eater = { userId: 'me', date: '2026-10-05', mealType: 'lunch' }
const HER: Eater = { userId: 'her', date: '2026-10-05', mealType: 'lunch' }

function source(name: string, per100g: number | null, perUnit: number | null = null) {
  return {
    ingredientId: `ing-${name}`,
    name,
    brand: null,
    nutrition: {
      per100g: per100g === null ? null : values(per100g, { protein: 10 }),
      perUnit: perUnit === null ? null : values(perUnit, { protein: 5 }),
      unitWeightG: null,
    },
  } satisfies MealItemSource
}

const MINCE = source('Mince', 250)
const PESTO = source('Pesto', 500)
const NOODLES = source('Noodles', 360)
const BREAD = source('Toast bread', null, 70)
const BUN = source('Bun', null, 150)
const PATTY = source('Patty', 240)
const GOUDA = source('Gouda', null, 80)
const CHEDDAR = source('Cheddar', null, 70)
const TOMATO = source('Tomato', 18)

function portion(id: string, eater: Eater | null, splitValue: number | null = null): DishPortion {
  return { id, eater, splitValue }
}

function dish(overrides: Partial<Dish>): Dish {
  return {
    id: 'dish',
    name: null,
    splitMode: 'equal',
    cookedWeightG: null,
    portions: [portion('p-me', ME), portion('p-her', HER)],
    lines: [],
    ...overrides,
  }
}

/** name → [amount, multiplier] per portion, for compact assertions */
function amountsOf(result: readonly PortionItems[], portionId: string) {
  const items = result.find((entry) => entry.portionId === portionId)?.items ?? []
  return Object.fromEntries(
    items.map(({ draft }) => [draft.name, [draft.entered_amount, draft.basis_multiplier]]),
  )
}

describe('buildDishLine', () => {
  test('a shared line holds the whole amount in the pot', () => {
    // Act
    const line = buildDishLine({
      id: 'l1',
      source: MINCE,
      unit: 'g',
      allocation: 'shared',
      amount: 500,
    })

    // Assert
    expect(line.allocation).toBe('shared')
    expect(line.item).toMatchObject({
      ingredient_id: 'ing-Mince',
      entered_amount: 500,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 5,
      kcal: 250,
      protein: 10,
    })
    expect(line.amounts).toEqual({})
  })

  test('a line with own amounts totals what was cooked for all portions', () => {
    const line = buildDishLine({
      id: 'l1',
      source: NOODLES,
      unit: 'g',
      allocation: 'per_portion',
      amounts: { 'p-me': 120, 'p-her': 100 },
    })

    expect(line.item).toMatchObject({ entered_amount: 220, basis_multiplier: 2.2 })
    expect(line.amounts).toEqual({ 'p-me': 120, 'p-her': 100 })
  })

  test('own amounts leave out portions without the ingredient', () => {
    const line = buildDishLine({
      id: 'l1',
      source: TOMATO,
      unit: 'g',
      allocation: 'per_portion',
      amounts: { 'p-her': 20, 'p-me': 0 },
    })

    expect(line.amounts).toEqual({ 'p-her': 20 })
    expect(line.item.entered_amount).toBe(20)
  })

  test('own amounts need at least one portion that has the ingredient', () => {
    expect(() =>
      buildDishLine({
        id: 'l1',
        source: TOMATO,
        unit: 'g',
        allocation: 'per_portion',
        amounts: { 'p-me': 0 },
      }),
    ).toThrow(RangeError)
  })

  test('negative own amounts are rejected', () => {
    expect(() =>
      buildDishLine({
        id: 'l1',
        source: TOMATO,
        unit: 'g',
        allocation: 'per_portion',
        amounts: { 'p-me': -5, 'p-her': 20 },
      }),
    ).toThrow(RangeError)
  })
})

describe('portionShares', () => {
  test('equal: every portion gets the same share, leftovers included', () => {
    const shares = portionShares(
      dish({ portions: [portion('a', ME), portion('b', HER), portion('rest', null)] }),
    )

    expect(shares.get('a')).toBeCloseTo(1 / 3)
    expect(shares.get('b')).toBeCloseTo(1 / 3)
    expect(shares.get('rest')).toBeCloseTo(1 / 3)
  })

  test('a dish eaten alone gives that portion the whole pot', () => {
    expect(portionShares(dish({ portions: [portion('a', ME)] })).get('a')).toBe(1)
  })

  test('count: shares follow the counts (3 toasts : 2 toasts)', () => {
    const shares = portionShares(
      dish({ splitMode: 'count', portions: [portion('a', ME, 3), portion('b', HER, 2)] }),
    )

    expect(shares.get('a')).toBeCloseTo(0.6)
    expect(shares.get('b')).toBeCloseTo(0.4)
  })

  test('percent: shares are the percentages, the rest stays uneaten', () => {
    const shares = portionShares(
      dish({ splitMode: 'percent', portions: [portion('a', ME, 50), portion('b', HER, 30)] }),
    )

    expect(shares.get('a')).toBeCloseTo(0.5)
    expect(shares.get('b')).toBeCloseTo(0.3)
  })

  test('weight: each plate is its part of the cooked pot', () => {
    const shares = portionShares(
      dish({
        splitMode: 'weight',
        cookedWeightG: 1450,
        portions: [portion('a', ME, 580), portion('b', HER, 435)],
      }),
    )

    expect(shares.get('a')).toBeCloseTo(0.4)
    expect(shares.get('b')).toBeCloseTo(0.3)
  })

  test('a portion can have no share of the pot (only own amounts)', () => {
    const shares = portionShares(
      dish({ splitMode: 'count', portions: [portion('a', ME, 2), portion('b', HER, 0)] }),
    )

    expect(shares.get('a')).toBe(1)
    expect(shares.get('b')).toBe(0)
  })

  test.each([
    ['a dish without portions', dish({ portions: [] })],
    [
      'count without a value',
      dish({ splitMode: 'count', portions: [portion('a', ME, 3), portion('b', HER)] }),
    ],
    [
      'count where nobody has any',
      dish({ splitMode: 'count', portions: [portion('a', ME, 0), portion('b', HER, 0)] }),
    ],
    [
      'negative values',
      dish({ splitMode: 'count', portions: [portion('a', ME, -1), portion('b', HER, 2)] }),
    ],
    [
      'percentages over 100',
      dish({ splitMode: 'percent', portions: [portion('a', ME, 60), portion('b', HER, 50)] }),
    ],
    [
      'weight without the cooked weight',
      dish({ splitMode: 'weight', portions: [portion('a', ME, 300), portion('b', HER, 200)] }),
    ],
    [
      'plates heavier than the pot',
      dish({
        splitMode: 'weight',
        cookedWeightG: 400,
        portions: [portion('a', ME, 300), portion('b', HER, 200)],
      }),
    ],
  ])('rejects %s', (_name, invalid) => {
    expect(() => portionShares(invalid)).toThrow(RangeError)
  })
})

describe('portionItems', () => {
  test('a pot split in half: everyone gets half of every ingredient', () => {
    // Arrange
    const chili = dish({
      lines: [
        buildDishLine({ id: 'l1', source: MINCE, unit: 'g', allocation: 'shared', amount: 500 }),
      ],
    })

    // Act
    const result = portionItems(chili)

    // Assert
    expect(amountsOf(result, 'p-me')).toEqual({ Mince: [250, 2.5] })
    expect(amountsOf(result, 'p-her')).toEqual({ Mince: [250, 2.5] })
  })

  test('toast: same ingredients, she has 2 and I have 3', () => {
    const toast = dish({
      splitMode: 'count',
      portions: [portion('p-me', ME, 3), portion('p-her', HER, 2)],
      lines: [
        buildDishLine({ id: 'l1', source: BREAD, unit: 'unit', allocation: 'shared', amount: 5 }),
        buildDishLine({ id: 'l2', source: GOUDA, unit: 'unit', allocation: 'shared', amount: 5 }),
      ],
    })

    const result = portionItems(toast)

    expect(amountsOf(result, 'p-me')).toEqual({ 'Toast bread': [3, 3], Gouda: [3, 3] })
    expect(amountsOf(result, 'p-her')).toEqual({ 'Toast bread': [2, 2], Gouda: [2, 2] })
  })

  test('burger: shared bun and patty, different cheese, tomato only for her', () => {
    const burger = dish({
      lines: [
        buildDishLine({ id: 'l1', source: BUN, unit: 'unit', allocation: 'shared', amount: 2 }),
        buildDishLine({ id: 'l2', source: PATTY, unit: 'g', allocation: 'shared', amount: 250 }),
        buildDishLine({
          id: 'l3',
          source: GOUDA,
          unit: 'unit',
          allocation: 'per_portion',
          amounts: { 'p-me': 1 },
        }),
        buildDishLine({
          id: 'l4',
          source: CHEDDAR,
          unit: 'unit',
          allocation: 'per_portion',
          amounts: { 'p-her': 1 },
        }),
        buildDishLine({
          id: 'l5',
          source: TOMATO,
          unit: 'g',
          allocation: 'per_portion',
          amounts: { 'p-her': 20 },
        }),
      ],
    })

    const result = portionItems(burger)

    expect(amountsOf(result, 'p-me')).toEqual({
      Bun: [1, 1],
      Patty: [125, 1.25],
      Gouda: [1, 1],
    })
    expect(amountsOf(result, 'p-her')).toEqual({
      Bun: [1, 1],
      Patty: [125, 1.25],
      Cheddar: [1, 1],
      Tomato: [20, 0.2],
    })
  })

  test('noodles: own pasta amounts, shared pesto', () => {
    const noodles = dish({
      lines: [
        buildDishLine({
          id: 'l1',
          source: NOODLES,
          unit: 'g',
          allocation: 'per_portion',
          amounts: { 'p-me': 120, 'p-her': 100 },
        }),
        buildDishLine({ id: 'l2', source: PESTO, unit: 'g', allocation: 'shared', amount: 90 }),
      ],
    })

    const result = portionItems(noodles)

    expect(amountsOf(result, 'p-me')).toEqual({ Noodles: [120, 1.2], Pesto: [45, 0.45] })
    expect(amountsOf(result, 'p-her')).toEqual({ Noodles: [100, 1], Pesto: [45, 0.45] })
  })

  test('items keep the line nutrition and point back to their line', () => {
    const chili = dish({
      lines: [
        buildDishLine({ id: 'l1', source: MINCE, unit: 'g', allocation: 'shared', amount: 500 }),
      ],
    })

    const [mine] = portionItems(chili)

    expect(mine?.eater).toEqual(ME)
    expect(mine?.items[0]?.lineId).toBe('l1')
    expect(mine?.items[0]?.draft).toMatchObject({
      ingredient_id: 'ing-Mince',
      name: 'Mince',
      basis: 'per_100g',
      kcal: 250,
      protein: 10,
    })
  })

  test('a leftover portion is computed too, without an eater', () => {
    const chili = dish({
      portions: [portion('p-me', ME), portion('p-her', HER), portion('rest', null)],
      lines: [
        buildDishLine({ id: 'l1', source: MINCE, unit: 'g', allocation: 'shared', amount: 300 }),
      ],
    })

    const rest = portionItems(chili).find((entry) => entry.portionId === 'rest')

    expect(rest?.eater).toBeNull()
    expect(amountsOf(portionItems(chili), 'rest')).toEqual({ Mince: [100, 1] })
  })

  test('thirds are rounded like logged items', () => {
    const chili = dish({
      portions: [portion('a', ME), portion('b', HER), portion('c', null)],
      lines: [
        buildDishLine({ id: 'l1', source: MINCE, unit: 'g', allocation: 'shared', amount: 100 }),
      ],
    })

    expect(amountsOf(portionItems(chili), 'a')).toEqual({ Mince: [33.33, 0.3333] })
  })

  test('a portion without a share or own amounts gets no items', () => {
    const salad = dish({
      splitMode: 'count',
      portions: [portion('p-me', ME, 1), portion('p-her', HER, 0)],
      lines: [
        buildDishLine({ id: 'l1', source: MINCE, unit: 'g', allocation: 'shared', amount: 200 }),
        buildDishLine({
          id: 'l2',
          source: TOMATO,
          unit: 'g',
          allocation: 'per_portion',
          amounts: { 'p-me': 50 },
        }),
      ],
    })

    expect(amountsOf(portionItems(salad), 'p-her')).toEqual({})
  })

  test('a share too small to log is left out instead of logging zero', () => {
    const pinch = dish({
      splitMode: 'weight',
      cookedWeightG: 100_000,
      portions: [portion('p-me', ME, 1)],
      lines: [
        buildDishLine({ id: 'l1', source: PESTO, unit: 'g', allocation: 'shared', amount: 1 }),
      ],
    })

    expect(amountsOf(portionItems(pinch), 'p-me')).toEqual({})
  })
})
