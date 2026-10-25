import { describe, expect, test } from 'vitest'
import { addFoodStepOf, addFoodStepPath, parentStep } from './addFoodSteps'

// a meal's Add food page
const BASE = '/today/meal-lunch-2026-10-21-u1/food'

describe('Cook steps as pages', () => {
  test.each([
    [{ kind: 'main' } as const, `${BASE}`],
    [{ kind: 'pick' } as const, `${BASE}/add`],
    [{ kind: 'custom' } as const, `${BASE}/add/custom`],
    [{ kind: 'newIngredient' } as const, `${BASE}/add/new`],
    [{ kind: 'newIngredient', barcode: '3017620422003' } as const, `${BASE}/add/new-3017620422003`],
    [{ kind: 'newLine', ingredientId: 'patty' } as const, `${BASE}/add/patty`],
    [{ kind: 'editLine', lineId: 'l-1' } as const, `${BASE}/line-l-1`],
    [{ kind: 'swap', lineId: 'l-1' } as const, `${BASE}/line-l-1/swap`],
    [
      { kind: 'swapLine', lineId: 'l-1', ingredientId: 'edamer' } as const,
      `${BASE}/line-l-1/swap/edamer`,
    ],
  ])('%o has its own address %s, and back', (step, path) => {
    expect(addFoodStepPath(step, BASE)).toBe(path)
    expect(addFoodStepOf(path, BASE)).toEqual(step)
  })

  test('each step sits one level below the one Back leads to', () => {
    // the page stack's back swipe drops the last part of the address
    expect(addFoodStepPath({ kind: 'newLine', ingredientId: 'patty' }, BASE)).toBe(
      `${addFoodStepPath({ kind: 'pick' }, BASE)}/patty`,
    )
    expect(addFoodStepPath({ kind: 'pick' }, BASE)).toBe(`${BASE}/add`)
    expect(addFoodStepPath({ kind: 'swap', lineId: 'l-1' }, BASE)).toBe(
      `${addFoodStepPath({ kind: 'editLine', lineId: 'l-1' }, BASE)}/swap`,
    )
  })

  test('Back from swapping goes to the line, from its amount to the search', () => {
    expect(parentStep({ kind: 'swap', lineId: 'l-1' })).toEqual({ kind: 'editLine', lineId: 'l-1' })
    expect(parentStep({ kind: 'swapLine', lineId: 'l-1', ingredientId: 'x' })).toEqual({
      kind: 'swap',
      lineId: 'l-1',
    })
  })

  test('odd characters in an id stay inside their part of the address', () => {
    const step = { kind: 'newLine', ingredientId: 'a/b c' } as const

    expect(addFoodStepOf(addFoodStepPath(step, BASE), BASE)).toEqual(step)
  })

  test('an unknown address below Add food shows the dish', () => {
    expect(addFoodStepOf(`${BASE}/whatever/else`, BASE)).toEqual({ kind: 'main' })
    expect(addFoodStepOf(`${BASE}/`, BASE)).toEqual({ kind: 'main' })
    // a broken escape, e.g. typed by hand
    expect(addFoodStepOf(`${BASE}/add/%E0`, BASE)).toEqual({ kind: 'main' })
    // not a valid barcode
    expect(addFoodStepOf(`${BASE}/add/new-123`, BASE)).toEqual({ kind: 'main' })
  })
})
