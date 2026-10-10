import { describe, expect, test } from 'vitest'
import {
  describeLine,
  estimatedLineNames,
  lineWho,
  newDish,
  rescaledLine,
  throwAwayLeftover,
  takeLeftover,
  withCookedWeight,
  withKcalEstimated,
  withLeftoverAdded,
  withLeftoverRemoved,
  withAddedLine,
  withLine,
  withName,
  withoutLine,
  withoutPortion,
  withPortion,
  withPortionMeal,
  withSplitMode,
  withSplitValue,
} from './dishDraft'
import type { DishLine } from './portions'
import { gramsItem, HER_LUNCH, ME_LUNCH, sharedLine, testDish } from './testData'

const NOODLES: DishLine = {
  id: 'l-noodles',
  allocation: 'per_portion',
  item: gramsItem('Noodles', 220, 360),
  amounts: { 'p-me': 120, 'p-her': 100 },
}
const TOMATO: DishLine = {
  id: 'l-tomato',
  allocation: 'per_portion',
  item: gramsItem('Tomato', 20, 18),
  amounts: { 'p-her': 20 },
}

describe('newDish', () => {
  test('one portion per eater, split equally, nothing in it yet', () => {
    const dish = newDish([ME_LUNCH, HER_LUNCH])

    expect(dish).toMatchObject({ name: null, splitMode: 'equal', cookedWeightG: null, lines: [] })
    expect(dish.portions.map((portion) => portion.eater)).toEqual([ME_LUNCH, HER_LUNCH])
    expect(new Set([dish.id, ...dish.portions.map((portion) => portion.id)]).size).toBe(3)
  })
})

describe('name', () => {
  test('a blank name is no name', () => {
    expect(withName(testDish(), '  ').name).toBeNull()
    expect(withName(testDish(), ' Burger ').name).toBe('Burger')
  })
})

describe('calories as an estimate', () => {
  test('a new dish is exact; it can be marked as an estimate and back', () => {
    const dish = newDish([ME_LUNCH])
    const estimated = withKcalEstimated(dish, true)

    expect(dish.kcalEstimated).toBe(false)
    expect(estimated.kcalEstimated).toBe(true)
    expect(withKcalEstimated(estimated, false).kcalEstimated).toBe(false)
    expect(dish.kcalEstimated).toBe(false)
  })
})

describe('ingredients marked as an estimate', () => {
  const PIZZA: DishLine = {
    ...sharedLine('l-pizza', 'Pizza from Luigi', 450, 260),
    item: { ...gramsItem('Pizza from Luigi', 450, 260), ingredient_id: 'pizza' },
  }
  const ESTIMATED = new Set(['pizza'])

  test('adding one marks the dish as an estimate', () => {
    const dish = withAddedLine(testDish({ kcalEstimated: false }), PIZZA, ESTIMATED)

    expect(dish.kcalEstimated).toBe(true)
    expect(dish.lines.at(-1)).toBe(PIZZA)
    expect(estimatedLineNames(dish, ESTIMATED)).toEqual(['Pizza from Luigi'])
  })

  test('switched off for the dish, it stays off when the line is changed later', () => {
    const added = withAddedLine(testDish(), PIZZA, ESTIMATED)
    const switchedOff = withKcalEstimated(added, false)

    expect(
      withAddedLine(switchedOff, { ...PIZZA, item: { ...PIZZA.item, kcal: 900 } }, ESTIMATED)
        .kcalEstimated,
    ).toBe(false)
  })

  test('other ingredients and custom items don’t change the mark', () => {
    const dish = withAddedLine(testDish({ kcalEstimated: false }), NOODLES, ESTIMATED)

    expect(dish.kcalEstimated).toBe(false)
    expect(estimatedLineNames(dish, ESTIMATED)).toEqual([])
  })
})

describe('split', () => {
  test('switching to count gives everyone 1', () => {
    const dish = withSplitMode(testDish(), 'count')

    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([1, 1])
  })

  test('switching to percent shares 100 % out evenly', () => {
    const dish = withSplitMode(testDish(), 'percent')

    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([50, 50])
  })

  test('switching to weight asks for the weights', () => {
    const dish = withSplitMode(testDish({ cookedWeightG: 900 }), 'weight')

    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([null, null])
    expect(dish.cookedWeightG).toBe(900)
  })

  test('one portion’s value and the cooked weight can be set', () => {
    const dish = withCookedWeight(withSplitValue(testDish(), 'p-her', 2), 1200)

    expect(dish.portions[1]?.splitValue).toBe(2)
    expect(dish.cookedWeightG).toBe(1200)
  })
})

describe('who eats', () => {
  test('a portion can move to another meal', () => {
    const dish = withPortionMeal(testDish(), 'p-her', 'dinner')

    expect(dish.portions[1]?.eater).toEqual({ ...HER_LUNCH, mealType: 'dinner' })
  })

  test('removing someone drops their own amounts and lines only they had', () => {
    const dish = withoutPortion(testDish({ lines: [NOODLES, TOMATO] }), 'p-her')

    expect(dish.portions.map((portion) => portion.id)).toEqual(['p-me'])
    expect(dish.lines).toEqual([
      expect.objectContaining({
        id: 'l-noodles',
        amounts: { 'p-me': 120 },
        item: expect.objectContaining({ entered_amount: 120, basis_multiplier: 1.2 }),
      }),
    ])
  })

  test('someone can join again', () => {
    const dish = withPortion(withoutPortion(testDish(), 'p-her'), HER_LUNCH)

    expect(dish.portions.map((portion) => portion.eater)).toEqual([ME_LUNCH, HER_LUNCH])
  })
})

describe('lines', () => {
  test('a new line is added at the end, an edited one stays in place', () => {
    const added = withLine(testDish(), NOODLES)
    const edited = withLine(added, sharedLine('l-mince', 'Mince', 500, 250))

    expect(edited.lines.map((line) => [line.id, line.item.entered_amount])).toEqual([
      ['l-mince', 500],
      ['l-noodles', 220],
    ])
  })

  test('a line can be removed', () => {
    expect(withoutLine(testDish(), 'l-mince').lines).toEqual([])
  })

  test('a line is rescaled from its snapshot: new amount or new owners', () => {
    const mince = sharedLine('l-mince', 'Mince', 400, 250)

    const more = rescaledLine(mince, { allocation: 'shared', amount: 500 })
    const own = rescaledLine(mince, {
      allocation: 'per_portion',
      amounts: { 'p-me': 150, 'p-her': 0 },
    })

    expect(more.item).toMatchObject({ entered_amount: 500, basis_multiplier: 5, kcal: 250 })
    expect(own).toMatchObject({ allocation: 'per_portion', amounts: { 'p-me': 150 } })
    expect(own.item).toMatchObject({ entered_amount: 150, basis_multiplier: 1.5 })
  })

  test('rescaling to nothing is refused', () => {
    const mince = sharedLine('l-mince', 'Mince', 400, 250)

    expect(() => rescaledLine(mince, { allocation: 'shared', amount: 0 })).toThrow(RangeError)
    expect(() =>
      rescaledLine(mince, { allocation: 'per_portion', amounts: { 'p-me': 0 } }),
    ).toThrow(RangeError)
  })

  test('who a line is for', () => {
    expect(lineWho(sharedLine('l', 'Mince', 400, 250))).toEqual({ kind: 'shared' })
    expect(lineWho(TOMATO)).toEqual({ kind: 'only', portionId: 'p-her' })
    expect(lineWho(NOODLES)).toEqual({ kind: 'own' })
  })

  test('describes amount and who it is for', () => {
    const nameOf = (portionId: string) => (portionId === 'p-me' ? 'Lukas' : 'Lisa')

    expect(describeLine(sharedLine('l', 'Mince', 400, 250), nameOf)).toBe('400 g · shared')
    expect(describeLine(TOMATO, nameOf)).toBe('20 g · only Lisa')
    expect(describeLine(NOODLES, nameOf)).toBe('Lukas 120 g · Lisa 100 g')
  })
})

describe('leftovers', () => {
  test('a leftover portion can be added and removed again while editing', () => {
    const more = withLeftoverAdded(withLeftoverAdded(testDish()))
    const fewer = withLeftoverRemoved(more)

    expect(more.portions.map((portion) => portion.eater)).toEqual([ME_LUNCH, HER_LUNCH, null, null])
    expect(fewer.portions.map((portion) => portion.eater)).toEqual([ME_LUNCH, HER_LUNCH, null])
    expect(withLeftoverRemoved(testDish())).toEqual(testDish())
  })

  test('a leftover added to a count split gets a count of 1', () => {
    const dish = withLeftoverAdded(withSplitMode(testDish(), 'count'))

    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([1, 1, 1])
  })

  test('taking a leftover gives it an eater', () => {
    const dish = withLeftoverAdded(testDish())
    const leftoverId = dish.portions[2]!.id

    const taken = takeLeftover(dish, leftoverId, { ...ME_LUNCH, mealType: 'dinner' })

    expect(taken.portions[2]?.eater).toEqual({ ...ME_LUNCH, mealType: 'dinner' })
  })

  test('throwing a leftover away keeps its portion (and share), marked as thrown away', () => {
    const dish = withLeftoverAdded(testDish())
    const leftoverId = dish.portions[2]!.id

    const thrown = throwAwayLeftover(dish, leftoverId)

    expect(thrown.portions).toHaveLength(3)
    expect(thrown.portions[2]).toMatchObject({ eater: null, discarded: true })
  })
})
