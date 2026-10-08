import { describe, expect, test } from 'vitest'
import { COOK_PATH, cookStepOf, cookStepPath } from './cookSteps'

describe('Cook steps as pages', () => {
  test.each([
    [{ kind: 'main' } as const, '/cook'],
    [{ kind: 'pick' } as const, '/cook/add'],
    [{ kind: 'custom' } as const, '/cook/add/custom'],
    [{ kind: 'newIngredient' } as const, '/cook/add/new'],
    [{ kind: 'newLine', ingredientId: 'patty' } as const, '/cook/add/patty'],
    [{ kind: 'editLine', lineId: 'l-1' } as const, '/cook/line-l-1'],
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
  })
})
