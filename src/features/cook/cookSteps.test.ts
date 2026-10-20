import { describe, expect, test } from 'vitest'
import { COOK_PATH, cookStepOf, cookStepPath, parentStep } from './cookSteps'

describe('Cook steps as pages', () => {
  test.each([
    [{ kind: 'main' } as const, '/cook'],
    [{ kind: 'pick' } as const, '/cook/add'],
    [{ kind: 'custom' } as const, '/cook/add/custom'],
    [{ kind: 'newIngredient' } as const, '/cook/add/new'],
    [{ kind: 'newIngredient', barcode: '3017620422003' } as const, '/cook/add/new-3017620422003'],
    [{ kind: 'newLine', ingredientId: 'patty' } as const, '/cook/add/patty'],
    [{ kind: 'editLine', lineId: 'l-1' } as const, '/cook/line-l-1'],
    [{ kind: 'swap', lineId: 'l-1' } as const, '/cook/line-l-1/swap'],
    [
      { kind: 'swapLine', lineId: 'l-1', ingredientId: 'edamer' } as const,
      '/cook/line-l-1/swap/edamer',
    ],
  ])('%o has its own address %s, and back', (step, path) => {
    expect(cookStepPath(step)).toBe(path)
    expect(cookStepOf(path)).toEqual(step)
  })

  test('each step sits one level below the one Back leads to', () => {
    // the page stack's back swipe drops the last part of the address
    expect(cookStepPath({ kind: 'newLine', ingredientId: 'patty' })).toBe(
      `${cookStepPath({ kind: 'pick' })}/patty`,
    )
    expect(cookStepPath({ kind: 'pick' })).toBe(`${COOK_PATH}/add`)
    expect(cookStepPath({ kind: 'swap', lineId: 'l-1' })).toBe(
      `${cookStepPath({ kind: 'editLine', lineId: 'l-1' })}/swap`,
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

    expect(cookStepOf(cookStepPath(step))).toEqual(step)
  })

  test('an unknown address under Cook shows the dish', () => {
    expect(cookStepOf('/cook/whatever/else')).toEqual({ kind: 'main' })
    expect(cookStepOf('/cook/')).toEqual({ kind: 'main' })
    // a broken escape, e.g. typed by hand
    expect(cookStepOf('/cook/add/%E0')).toEqual({ kind: 'main' })
    // not a valid barcode
    expect(cookStepOf('/cook/add/new-123')).toEqual({ kind: 'main' })
  })
})
