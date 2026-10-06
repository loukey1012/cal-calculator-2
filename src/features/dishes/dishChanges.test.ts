import { dehydrate, hydrate, onlineManager, type QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./dishesApi', () => ({ saveDish: vi.fn(), deleteDish: vi.fn(), fetchDish: vi.fn() }))

import { DEHYDRATE_OPTIONS } from '../../lib/persistence'
import { createQueryClient } from '../../lib/queryClient'
import { dayMeal, mealItem } from '../meals/testData'
import {
  affectedDays,
  applyDishChange,
  applyDishChangeToDay,
  applyDishChangeToLeftovers,
  DISH_CHANGES_KEY,
  registerDishChangeDefaults,
  type DishChange,
} from './dishChanges'
import { deleteDish, saveDish } from './dishesApi'
import { DAY, HER_LUNCH, ME_LUNCH, sharedLine, testDish } from './testData'

const ME_DAY = { userId: 'me', date: DAY }
const HER_DAY = { userId: 'her', date: DAY }

const SAVE: DishChange = {
  kind: 'save',
  dish: testDish(),
  baseRevision: null,
  previousPortionIds: [],
  replaceItemIds: [],
  days: [ME_DAY, HER_DAY],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(deleteDish).mockResolvedValue()
})

afterEach(() => {
  onlineManager.setOnline(true)
})

describe('applyDishChange', () => {
  test('sends a save with its base revision and replaced items, and a delete by id', async () => {
    await applyDishChange({ ...SAVE, baseRevision: 'rev-0', replaceItemIds: ['item-9'] })
    await applyDishChange({ kind: 'delete', dishId: 'dish-1', previousPortionIds: [], days: [] })

    expect(saveDish).toHaveBeenCalledWith({
      dish: SAVE.dish,
      baseRevision: 'rev-0',
      replaceItemIds: ['item-9'],
    })
    expect(deleteDish).toHaveBeenCalledWith('dish-1')
  })
})

describe('affectedDays', () => {
  test('every day an eater had or gets a portion on, plus the day of replaced items, once', () => {
    const before = testDish({
      portions: [
        { id: 'p-me', eater: { ...ME_LUNCH, date: '2026-10-04' }, splitValue: null },
        { id: 'p-rest', eater: null, splitValue: null },
      ],
    })

    const days = affectedDays(before, testDish(), ME_DAY)

    expect(days).toEqual([{ userId: 'me', date: '2026-10-04' }, ME_DAY, HER_DAY])
  })

  test('a deleted dish affects the days it was eaten on', () => {
    expect(affectedDays(testDish(), null, null)).toEqual([ME_DAY, HER_DAY])
  })
})

describe('applyDishChangeToDay', () => {
  const otherFood = mealItem({ id: 'apple', name: 'Apple' })

  test('a save puts each eater’s portion into their meal of that day', () => {
    // Arrange
    const myDay = [dayMeal('m1', 'lunch', [otherFood])]

    // Act
    const mine = applyDishChangeToDay(myDay, SAVE, ME_DAY)
    const hers = applyDishChangeToDay([], SAVE, HER_DAY)

    // Assert
    expect(mine[0]?.meal_items.map((item) => [item.name, item.entered_amount])).toEqual([
      ['Apple', 100],
      ['Mince', 200],
    ])
    expect(mine[0]?.meal_items[1]).toMatchObject({
      dish_portion_id: 'p-me',
      dish_line_id: 'l-mince',
      basis_multiplier: 2,
      meal_id: 'm1',
    })
    expect(hers).toEqual([
      expect.objectContaining({
        meal_type: 'lunch',
        meal_items: [expect.objectContaining({ name: 'Mince', dish_portion_id: 'p-her' })],
      }),
    ])
  })

  test('the shown items know how many portions their dish has and how many are eaten', () => {
    const withLeftover = testDish({
      portions: [...testDish().portions, { id: 'p-left', eater: null, splitValue: null }],
    })

    const day = applyDishChangeToDay([], { ...SAVE, dish: withLeftover }, ME_DAY)

    expect(day[0]?.meal_items[0]?.dish).toEqual({
      id: 'dish-1',
      name: 'Chili',
      portionCount: 3,
      eaterCount: 2,
    })
  })

  test('saving again replaces the earlier portion instead of adding a second one', () => {
    const once = applyDishChangeToDay([], SAVE, ME_DAY)
    const moreMince = {
      ...SAVE,
      dish: testDish({ lines: [sharedLine('l-mince', 'Mince', 600, 250)] }),
      previousPortionIds: ['p-me', 'p-her'],
    }

    const twice = applyDishChangeToDay(once, moreMince, ME_DAY)

    expect(twice[0]?.meal_items.map((item) => item.entered_amount)).toEqual([300])
  })

  test('a portion moved to another meal leaves the old one', () => {
    const once = applyDishChangeToDay([], SAVE, ME_DAY)
    const moved = {
      ...SAVE,
      dish: testDish({
        portions: [
          { id: 'p-me', eater: { ...ME_LUNCH, mealType: 'dinner' }, splitValue: null },
          { id: 'p-her', eater: HER_LUNCH, splitValue: null },
        ],
      }),
      previousPortionIds: ['p-me', 'p-her'],
    } satisfies DishChange

    const after = applyDishChangeToDay(once, moved, ME_DAY)

    expect(after.find((meal) => meal.meal_type === 'lunch')?.meal_items).toEqual([])
    expect(after.find((meal) => meal.meal_type === 'dinner')?.meal_items).toHaveLength(1)
  })

  test('"share this meal" removes the plain items the dish replaces', () => {
    const myDay = [dayMeal('m1', 'lunch', [otherFood, mealItem({ id: 'oats' })])]

    const after = applyDishChangeToDay(myDay, { ...SAVE, replaceItemIds: ['oats'] }, ME_DAY)

    expect(after[0]?.meal_items.map((item) => item.id)).not.toContain('oats')
    expect(after[0]?.meal_items.map((item) => item.name)).toEqual(['Apple', 'Mince'])
  })

  test('a leftover portion is not logged anywhere', () => {
    const withLeftover = {
      ...SAVE,
      dish: testDish({
        portions: [
          { id: 'p-me', eater: ME_LUNCH, splitValue: null },
          { id: 'p-rest', eater: null, splitValue: null },
        ],
      }),
    }

    const after = applyDishChangeToDay([], withLeftover, ME_DAY)

    expect(after.flatMap((meal) => meal.meal_items).map((item) => item.dish_portion_id)).toEqual([
      'p-me',
    ])
  })

  test('a delete removes the dish’s portion and leaves other food alone', () => {
    const logged = applyDishChangeToDay([dayMeal('m1', 'lunch', [otherFood])], SAVE, ME_DAY)

    const after = applyDishChangeToDay(
      logged,
      { kind: 'delete', dishId: 'dish-1', previousPortionIds: ['p-me', 'p-her'], days: [ME_DAY] },
      ME_DAY,
    )

    expect(after[0]?.meal_items.map((item) => item.id)).toEqual(['apple'])
  })
})

describe('dish changes survive an app restart', () => {
  function queueChange(client: QueryClient, change: DishChange) {
    void client
      .getMutationCache()
      .build(client, { mutationKey: DISH_CHANGES_KEY })
      .execute(change)
      .catch(() => {})
  }

  test('a save queued offline is stored and sent after restoring into a fresh app', async () => {
    onlineManager.setOnline(false)
    const before = createQueryClient()
    registerDishChangeDefaults(before)
    queueChange(before, SAVE)
    await vi.waitFor(() => expect(before.getMutationCache().getAll()[0]?.state.isPaused).toBe(true))

    const stored = JSON.parse(JSON.stringify(dehydrate(before, DEHYDRATE_OPTIONS)))
    const after = createQueryClient()
    registerDishChangeDefaults(after)
    hydrate(after, stored)
    onlineManager.setOnline(true)
    await after.resumePausedMutations()

    expect(saveDish).toHaveBeenCalledTimes(1)
    expect(saveDish).toHaveBeenCalledWith(expect.objectContaining({ dish: SAVE.dish }))
  })

  test('a restored change refreshes the dish and every day it touched once it is done', async () => {
    const client = createQueryClient()
    registerDishChangeDefaults(client)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await client.getMutationCache().build(client, { mutationKey: DISH_CHANGES_KEY }).execute(SAVE)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dish', 'dish-1'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['day', 'me', DAY] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['day', 'her', DAY] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['month', 'me'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['month', 'her'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leftovers'] })
  })
})

describe('applyDishChangeToLeftovers', () => {
  const withLeftover = testDish({
    portions: [
      { id: 'p-me', eater: ME_LUNCH, splitValue: null },
      { id: 'p-rest', eater: null, splitValue: null },
    ],
  })
  const otherDish = { ...withLeftover, id: 'dish-2' }

  test('a dish saved with a leftover joins the list, one whose leftover was taken leaves it', () => {
    const added = applyDishChangeToLeftovers([otherDish], { ...SAVE, dish: withLeftover })
    const taken = applyDishChangeToLeftovers(added, SAVE)

    expect(added.map((dish) => dish.id)).toEqual(['dish-2', 'dish-1'])
    expect(taken.map((dish) => dish.id)).toEqual(['dish-2'])
  })

  test('a thrown-away leftover leaves the list', () => {
    const thrown = testDish({
      portions: [
        { id: 'p-me', eater: ME_LUNCH, splitValue: null },
        { id: 'p-rest', eater: null, splitValue: null, discarded: true },
      ],
    })

    expect(applyDishChangeToLeftovers([withLeftover], { ...SAVE, dish: thrown })).toEqual([])
  })

  test('a deleted dish leaves the list', () => {
    const change: DishChange = {
      kind: 'delete',
      dishId: 'dish-1',
      previousPortionIds: [],
      days: [],
    }

    expect(applyDishChangeToLeftovers([withLeftover, otherDish], change)).toEqual([otherDish])
  })
})
