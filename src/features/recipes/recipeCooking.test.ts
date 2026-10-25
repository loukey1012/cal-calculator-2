import { describe, expect, test } from 'vitest'
import { gramsItem, sharedLine } from '../dishes/testData'
import { ingredient } from '../ingredients/testData'
import {
  cookFromRecipe,
  currentChoiceId,
  lineOfSlot,
  recipeKcal,
  withChoice,
  withSlotIncluded,
} from './recipeCooking'
import { productLine, slot, testRecipe } from './testData'

const eaterOf = (userId: string) => ({ userId, date: '', mealType: 'snack' as const })

const CLEVER = productLine('c-clever', 'clever', 'Toastbrot Clever', 60, 260)
const SPAR = productLine('c-spar', 'spar', 'Toastbrot Spar', 60, 250)
const GOUDA = productLine('c-gouda', 'gouda', 'Gouda', 30, 350)
const EDAMER = productLine('c-edamer', 'edamer', 'Edamer', 25, 330)
const FRISCHKAESE = productLine('c-frisch', 'frisch', 'Frischkäse', 20, 200)

const TOAST = testRecipe({
  name: 'Toast',
  portions: [{ id: 'rp-me', userId: 'me', splitValue: null }],
  slots: [
    slot('s-bread', [CLEVER, SPAR], { pickedId: 'c-spar' }),
    slot('s-cheese', [GOUDA, EDAMER]),
    slot('s-frisch', [FRISCHKAESE], { optional: true, leftOut: true }),
  ],
})

describe('cookFromRecipe', () => {
  test('the choices of last time, an optional line as last time', () => {
    // Act
    const { dish, link } = cookFromRecipe(TOAST, [], eaterOf)

    // Assert
    expect(dish.name).toBe('Toast')
    expect(dish.lines.map((line) => line.item.name)).toEqual(['Toastbrot Spar', 'Gouda'])
    expect(link.slots['s-frisch']).toBeNull()
    expect(lineOfSlot(dish, link, 's-bread')?.item.name).toBe('Toastbrot Spar')
    expect(link.portions['rp-me']).toBe(dish.portions[0]?.id)
  })

  test('uses the current values of the ingredient, at the saved amount', () => {
    const leaner = ingredient({ id: 'gouda', name: 'Gouda light', kcal_100: 250 })

    const { dish } = cookFromRecipe(TOAST, [leaner], eaterOf)

    expect(dish.lines[1]?.item).toMatchObject({
      name: 'Gouda light',
      entered_amount: 30,
      kcal: 250,
      basis_multiplier: 0.3,
    })
  })

  test('custom items, deleted ingredients and a lost unit keep the saved values', () => {
    const custom = sharedLine('c-cake', 'Cake', 100, 400)
    const bar = {
      ...productLine('c-bar', 'bar', 'Bar', 1, 0),
      item: {
        ...gramsItem('Bar', 1, 0),
        ingredient_id: 'bar',
        entered_unit: 'unit' as const,
        basis: 'per_unit' as const,
        basis_multiplier: 1,
        kcal: 210,
      },
    }
    const recipe = testRecipe({ slots: [slot('s-cake', [custom]), slot('s-bar', [bar])] })

    const { dish } = cookFromRecipe(recipe, [ingredient({ id: 'bar', kcal_100: 450 })], eaterOf)

    expect(dish.lines.map((line) => line.item)).toEqual([custom.item, bar.item])
  })

  test('own amounts follow their person to the new portions', () => {
    // Arrange
    const cheese = {
      id: 'c-cheese',
      allocation: 'per_portion' as const,
      item: gramsItem('Cheese', 30, 400),
      amounts: { 'rp-me': 20, 'rp-her': 10 },
    }
    const recipe = testRecipe({
      splitMode: 'percent',
      portions: [
        { id: 'rp-me', userId: 'me', splitValue: 60 },
        { id: 'rp-her', userId: 'her', splitValue: 30 },
        { id: 'rp-left', userId: null, splitValue: 10 },
      ],
      slots: [slot('s-cheese', [cheese])],
    })

    // Act
    const { dish, link } = cookFromRecipe(recipe, [], eaterOf)

    // Assert
    const [me, her, left] = dish.portions
    expect([me?.eater?.userId, her?.eater?.userId, left?.eater]).toEqual(['me', 'her', null])
    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([60, 30, 10])
    expect(dish.lines[0]?.amounts).toEqual({ [me?.id ?? '']: 20, [her?.id ?? '']: 10 })
    expect(link.portions).toEqual({ 'rp-me': me?.id, 'rp-her': her?.id, 'rp-left': left?.id })
  })
})

describe('choosing in Add food', () => {
  test('another product of a line takes its place, with its own amount', () => {
    // Arrange
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const cheese = TOAST.slots[1]
    if (!cheese) throw new Error('no cheese line')

    // Act
    const next = withChoice(cooked, cheese, 'c-edamer', [])

    // Assert
    const line = lineOfSlot(next.dish, next.link, 's-cheese')
    expect(line?.item).toMatchObject({ name: 'Edamer', entered_amount: 25 })
    expect(line?.id).toBe(lineOfSlot(cooked.dish, cooked.link, 's-cheese')?.id)
    expect(currentChoiceId(cheese, next.dish, next.link)).toBe('c-edamer')
    expect(next.dish.lines).toHaveLength(2)
  })

  test('an optional line is switched on with its last product, and off again', () => {
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const frisch = TOAST.slots[2]
    if (!frisch) throw new Error('no Frischkäse line')

    const on = withSlotIncluded(cooked, frisch, true, [])
    const off = withSlotIncluded(on, frisch, false, [])

    expect(on.dish.lines.map((line) => line.item.name)).toContain('Frischkäse')
    expect(on.link.slots['s-frisch']).toBe(on.dish.lines.at(-1)?.id)
    expect(off.dish.lines.map((line) => line.item.name)).toEqual(['Toastbrot Spar', 'Gouda'])
    expect(off.link.slots['s-frisch']).toBeNull()
  })

  test('a product swapped in while adding is none of the choices yet', () => {
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const cheese = TOAST.slots[1]
    if (!cheese) throw new Error('no cheese line')
    const lineId = cooked.link.slots['s-cheese'] ?? ''
    const swapped = {
      ...cooked.dish,
      lines: cooked.dish.lines.map((line) =>
        line.id === lineId ? productLine(lineId, 'emmentaler', 'Emmentaler', 25, 380) : line,
      ),
    }

    expect(currentChoiceId(cheese, swapped, cooked.link)).toBeUndefined()
  })
})

describe('recipeKcal', () => {
  test('the recipe as it would be cooked now: last choices, without left-out lines', () => {
    // 60 g Spar toast at 250 + 30 g Gouda at 350
    expect(recipeKcal(TOAST, [])).toBe(150 + 105)
  })
})
