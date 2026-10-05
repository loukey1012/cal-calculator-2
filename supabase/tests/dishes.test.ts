import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  buildDishLine,
  portionItems,
  type Dish,
  type DishPortion,
} from '../../src/features/dishes/portions'
import { values } from '../../src/features/nutrition/testData'
import { anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob cook together; Carol is in another household.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let aliceIngredientId: string
let carolIngredientId: string

const DAY = '2026-10-02'

type Allocation = 'shared' | 'per_portion'

type LinePayload = {
  readonly id: string
  readonly allocation: Allocation
  readonly ingredient_id: string | null
  readonly name: string
  readonly brand: null
  readonly entered_amount: number
  readonly entered_unit: 'g' | 'unit'
  readonly basis: 'per_100g' | 'per_unit'
  readonly basis_multiplier: number
  readonly kcal: number
  readonly protein: number | null
  readonly carbs: null
  readonly sugar: null
  readonly fat: null
  readonly sat_fat: null
  readonly fiber: null
  readonly salt: null
  readonly amounts: ReadonlyArray<{ readonly portion_id: string; readonly amount: number }>
}

type PortionPayload = {
  readonly id: string
  readonly user_id: string | null
  readonly date: string | null
  readonly meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  readonly split_value: number | null
  /** a leftover nobody will eat; it keeps its share so the others' portions don't change */
  readonly discarded?: boolean
}

type DishPayload = {
  readonly id: string
  readonly name: string | null
  readonly split_mode: 'equal' | 'count' | 'percent' | 'weight'
  readonly cooked_weight_g: number | null
  readonly revision: string
  readonly portions: readonly PortionPayload[]
  readonly lines: readonly LinePayload[]
}

const uuid = () => crypto.randomUUID()

function sharedGrams(name: string, grams: number, kcalPer100: number): LinePayload {
  return {
    id: uuid(),
    allocation: 'shared',
    ingredient_id: null,
    name,
    brand: null,
    entered_amount: grams,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: grams / 100,
    kcal: kcalPer100,
    protein: 10,
    carbs: null,
    sugar: null,
    fat: null,
    sat_fat: null,
    fiber: null,
    salt: null,
    amounts: [],
  }
}

function ownGrams(
  name: string,
  kcalPer100: number,
  amounts: ReadonlyArray<readonly [string, number]>,
): LinePayload {
  const total = amounts.reduce((sum, [, amount]) => sum + amount, 0)
  return {
    ...sharedGrams(name, total, kcalPer100),
    allocation: 'per_portion',
    amounts: amounts.map(([portion_id, amount]) => ({ portion_id, amount })),
  }
}

function eats(id: string, user: TestUser, splitValue: number | null = null): PortionPayload {
  return { id, user_id: user.id, date: DAY, meal_type: 'lunch', split_value: splitValue }
}

function leftover(id: string, splitValue: number | null = null): PortionPayload {
  return { id, user_id: null, date: null, meal_type: null, split_value: splitValue }
}

function dish(overrides: Partial<DishPayload>): DishPayload {
  return {
    id: uuid(),
    name: 'Burger',
    split_mode: 'equal',
    cooked_weight_g: null,
    revision: uuid(),
    portions: [],
    lines: [],
    ...overrides,
  }
}

function saveDish(
  client: SupabaseClient,
  payload: DishPayload,
  baseRevision: string | null = null,
  replaceItemIds: readonly string[] = [],
) {
  return client.rpc('save_dish', {
    p_dish: payload,
    p_base_revision: baseRevision,
    p_replace_item_ids: replaceItemIds,
  })
}

/** name → [entered_amount, basis_multiplier] of a dish's items in one person's meal */
async function dishItemsOf(user: TestUser, dishId: string, mealType = 'lunch') {
  const { data, error } = await user.client
    .from('meal_items')
    .select(
      'name, entered_amount, basis_multiplier, dish_line_id, dish_portions!inner(dish_id), meals!inner(user_id, date, meal_type)',
    )
    .eq('dish_portions.dish_id', dishId)
    .eq('meals.user_id', user.id)
    .eq('meals.date', DAY)
    .eq('meals.meal_type', mealType)
  if (error) throw new Error(error.message)
  return Object.fromEntries(
    data.map((item) => [item.name, [Number(item.entered_amount), Number(item.basis_multiplier)]]),
  )
}

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')

  const household = await alice.client.rpc('create_household', { p_name: 'Kitchen' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Elsewhere' })
  if (other.error) throw new Error(other.error.message)

  const mine = await alice.client
    .from('ingredients')
    .insert({ household_id: household.data.id, name: 'Patty', kcal_100: 240 })
    .select('id')
    .single()
  if (mine.error) throw new Error(mine.error.message)
  aliceIngredientId = mine.data.id
  const theirs = await carol.client
    .from('ingredients')
    .insert({ household_id: other.data.id, name: 'Secret', kcal_100: 100 })
    .select('id')
    .single()
  if (theirs.error) throw new Error(theirs.error.message)
  carolIngredientId = theirs.data.id
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('saving a dish', () => {
  test('logs each person’s portion into their own meal (shared base, own extras)', async () => {
    // Arrange
    const burger = dish({
      portions: [eats('a', alice), eats('b', bob)],
      lines: [
        { ...sharedGrams('Patty', 250, 240), ingredient_id: aliceIngredientId },
        ownGrams('Gouda', 350, [['a', 30]]),
        ownGrams('Tomato', 18, [['b', 20]]),
      ],
    })
    // portion ids must be unique: give this dish its own
    const payload = withFreshPortionIds(burger)

    // Act
    const { error } = await saveDish(alice.client, payload)

    // Assert
    expect(error).toBeNull()
    expect(await dishItemsOf(alice, payload.id)).toEqual({ Patty: [125, 1.25], Gouda: [30, 0.3] })
    expect(await dishItemsOf(bob, payload.id)).toEqual({ Patty: [125, 1.25], Tomato: [20, 0.2] })
  })

  test('own pasta amounts and a shared sauce', async () => {
    const noodles = withFreshPortionIds(
      dish({
        name: 'Pesto noodles',
        portions: [eats('a', alice), eats('b', bob)],
        lines: [
          ownGrams('Noodles', 360, [
            ['a', 120],
            ['b', 100],
          ]),
          sharedGrams('Pesto', 90, 500),
        ],
      }),
    )

    const { error } = await saveDish(bob.client, noodles)

    expect(error).toBeNull()
    expect(await dishItemsOf(alice, noodles.id)).toEqual({ Noodles: [120, 1.2], Pesto: [45, 0.45] })
    expect(await dishItemsOf(bob, noodles.id)).toEqual({ Noodles: [100, 1], Pesto: [45, 0.45] })
  })

  test('count split: 3 toasts and 2 toasts', async () => {
    const toast = withFreshPortionIds(
      dish({
        name: 'Toast',
        split_mode: 'count',
        portions: [eats('a', alice, 3), eats('b', bob, 2)],
        lines: [sharedGrams('Toast bread', 150, 260)],
      }),
    )

    const { error } = await saveDish(alice.client, toast)

    expect(error).toBeNull()
    expect(await dishItemsOf(alice, toast.id)).toEqual({ 'Toast bread': [90, 0.9] })
    expect(await dishItemsOf(bob, toast.id)).toEqual({ 'Toast bread': [60, 0.6] })
  })

  test('weight split: each plate’s part of the cooked pot', async () => {
    const chili = withFreshPortionIds(
      dish({
        name: 'Chili',
        split_mode: 'weight',
        cooked_weight_g: 1000,
        portions: [eats('a', alice, 400), eats('b', bob, 300)],
        lines: [sharedGrams('Mince', 500, 250)],
      }),
    )

    const { error } = await saveDish(alice.client, chili)

    expect(error).toBeNull()
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [200, 2] })
    expect(await dishItemsOf(bob, chili.id)).toEqual({ Mince: [150, 1.5] })
  })

  test('a leftover portion is kept but not logged for anyone', async () => {
    const chili = withFreshPortionIds(
      dish({
        name: 'Chili',
        portions: [eats('a', alice), eats('b', bob), leftover('c')],
        lines: [sharedGrams('Mince', 300, 250)],
      }),
    )

    const { error } = await saveDish(alice.client, chili)
    const portions = await bob.client
      .from('dish_portions')
      .select('user_id, position')
      .eq('dish_id', chili.id)
      .order('position')
    const logged = await alice.client
      .from('meal_items')
      .select('id, dish_portions!inner(dish_id)')
      .eq('dish_portions.dish_id', chili.id)

    expect(error).toBeNull()
    expect(portions.data?.map((portion) => portion.user_id)).toEqual([alice.id, bob.id, null])
    expect(logged.data).toHaveLength(2)
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [100, 1] })
  })

  test('dish portions count in the meal totals like any other food', async () => {
    const soup = withFreshPortionIds(
      dish({
        name: 'Soup',
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Soup', 600, 50)],
      }),
    )
    const dinner = { ...soup, portions: soup.portions.map((p) => ({ ...p, meal_type: 'dinner' })) }

    await saveDish(alice.client, dinner as DishPayload)
    const totals = await alice.client
      .from('meal_totals')
      .select('kcal')
      .eq('user_id', alice.id)
      .eq('date', DAY)
      .eq('meal_type', 'dinner')
      .single()

    expect(Number(totals.data?.kcal)).toBe(150)
  })
})

describe('changing a dish', () => {
  test('resending the same save changes nothing (safe offline retry)', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )

    const first = await saveDish(alice.client, chili)
    const second = await saveDish(alice.client, chili)

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [200, 2] })
  })

  test('a new revision replaces the portions instead of adding more', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)
    const moreMince = {
      ...chili,
      revision: uuid(),
      lines: [{ ...sharedGrams('Mince', 600, 250), id: chili.lines[0]!.id }],
    }

    const { error } = await saveDish(bob.client, moreMince, chili.revision)

    expect(error).toBeNull()
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [300, 3] })
    expect(await dishItemsOf(bob, chili.id)).toEqual({ Mince: [300, 3] })
  })

  test('a save based on an outdated revision is rejected', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)
    const bobsEdit = { ...chili, revision: uuid() }
    await saveDish(bob.client, bobsEdit, chili.revision)
    const alicesStaleEdit = { ...chili, revision: uuid() }

    const { error } = await saveDish(alice.client, alicesStaleEdit, chili.revision)

    expect(error?.message).toMatch(/changed meanwhile/i)
  })

  test('a thrown-away leftover keeps its share, so the eaten portions stay the same', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob), leftover('c')],
        lines: [sharedGrams('Mince', 300, 250)],
      }),
    )
    await saveDish(alice.client, chili)
    const thrownAway = {
      ...chili,
      revision: uuid(),
      portions: chili.portions.map((portion) =>
        portion.user_id === null ? { ...portion, discarded: true } : portion,
      ),
    }

    const { error } = await saveDish(bob.client, thrownAway, chili.revision)
    const portions = await alice.client
      .from('dish_portions')
      .select('user_id, discarded')
      .eq('dish_id', chili.id)
      .order('position')

    expect(error).toBeNull()
    expect(portions.data).toEqual([
      { user_id: alice.id, discarded: false },
      { user_id: bob.id, discarded: false },
      { user_id: null, discarded: true },
    ])
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [100, 1] })
  })

  test('an eaten portion cannot be thrown away', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [{ ...eats('a', alice), discarded: true }],
        lines: [sharedGrams('Mince', 300, 250)],
      }),
    )

    const { error } = await saveDish(alice.client, chili)

    expect(error?.code).toBe('23514')
  })

  test('taking a leftover logs it into that meal', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), leftover('c')],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)
    const taken = {
      ...chili,
      revision: uuid(),
      portions: [
        chili.portions[0]!,
        { ...chili.portions[1]!, ...eats('x', bob), id: chili.portions[1]!.id },
      ],
    }

    const { error } = await saveDish(bob.client, taken, chili.revision)

    expect(error).toBeNull()
    expect(await dishItemsOf(bob, chili.id)).toEqual({ Mince: [200, 2] })
  })

  test('sharing a meal afterwards moves its items into the dish', async () => {
    const mealId = await alice.client.rpc('ensure_meal', {
      p_user_id: alice.id,
      p_date: DAY,
      p_meal_type: 'breakfast',
    })
    const itemId = uuid()
    await alice.client.from('meal_items').insert({
      id: itemId,
      meal_id: mealId.data,
      name: 'Oats',
      entered_amount: 160,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 1.6,
      kcal: 370,
    })
    const oats = withFreshPortionIds(
      dish({
        name: 'Porridge',
        portions: [
          { ...eats('a', alice), meal_type: 'breakfast' },
          { ...eats('b', bob), meal_type: 'breakfast' },
        ],
        lines: [sharedGrams('Oats', 160, 370)],
      }),
    )

    const { error } = await saveDish(alice.client, oats, null, [itemId])
    const original = await alice.client.from('meal_items').select('id').eq('id', itemId)

    expect(error).toBeNull()
    expect(original.data).toEqual([])
    expect(await dishItemsOf(alice, oats.id, 'breakfast')).toEqual({ Oats: [80, 0.8] })
    expect(await dishItemsOf(bob, oats.id, 'breakfast')).toEqual({ Oats: [80, 0.8] })
  })

  test('delete_dish removes the dish and everyone’s portion; deleting again is fine', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)

    const first = await bob.client.rpc('delete_dish', { p_dish_id: chili.id })
    const again = await bob.client.rpc('delete_dish', { p_dish_id: chili.id })
    const left = await alice.client.from('dishes').select('id').eq('id', chili.id)

    expect(first.error).toBeNull()
    expect(again.error).toBeNull()
    expect(left.data).toEqual([])
    expect(await dishItemsOf(alice, chili.id)).toEqual({})
    expect(await dishItemsOf(bob, chili.id)).toEqual({})
  })
})

describe('invalid dishes are rejected', () => {
  test.each([
    ['no portions', { portions: [] }, /portion/i],
    ['no ingredients', { lines: [] }, /ingredient/i],
    [
      'percentages over 100',
      {
        split_mode: 'percent',
        portions: [eats('a', {} as TestUser, 60), eats('b', {} as TestUser, 50)],
      },
      /100/,
    ],
    [
      'a count split with a missing count',
      { split_mode: 'count', portions: [eats('a', {} as TestUser, 3), eats('b', {} as TestUser)] },
      /value/i,
    ],
    [
      'plates heavier than the pot',
      {
        split_mode: 'weight',
        cooked_weight_g: 500,
        portions: [eats('a', {} as TestUser, 300), eats('b', {} as TestUser, 300)],
      },
      /weigh/i,
    ],
    [
      'a weight split without the cooked weight',
      { split_mode: 'weight', portions: [eats('a', {} as TestUser, 300)] },
      /weigh/i,
    ],
  ] as const)('%s', async (_name, overrides, message) => {
    const base = dish({
      portions: [eats('a', alice), eats('b', bob)],
      lines: [sharedGrams('Mince', 400, 250)],
      ...(overrides as Partial<DishPayload>),
    })
    const payload = withFreshPortionIds({
      ...base,
      portions: base.portions.map((portion) => ({ ...portion, user_id: alice.id })),
    })

    const { error } = await saveDish(alice.client, payload)

    expect(error?.message).toMatch(message)
  })

  test('own amounts must add up to the line’s total', async () => {
    const line = { ...ownGrams('Noodles', 360, [['a', 120]]), entered_amount: 500 }
    const payload = withFreshPortionIds(dish({ portions: [eats('a', alice)], lines: [line] }))

    const { error } = await saveDish(alice.client, payload)

    expect(error?.message).toMatch(/add up/i)
  })

  test('own amounts must belong to a portion of the dish', async () => {
    const payload = withFreshPortionIds(
      dish({ portions: [eats('a', alice)], lines: [ownGrams('Noodles', 360, [[uuid(), 120]])] }),
    )

    const { error } = await saveDish(alice.client, payload)

    expect(error).not.toBeNull()
  })
})

describe('the app and the server split a dish the same way', () => {
  function source(
    name: string,
    per100g: number | null,
    perUnit: number | null,
    unitWeightG: number | null,
  ) {
    return {
      ingredientId: null,
      name,
      brand: null,
      nutrition: {
        per100g: per100g === null ? null : values(per100g, { protein: 7.3 }),
        perUnit: perUnit === null ? null : values(perUnit, { protein: 2.1 }),
        unitWeightG,
      },
    }
  }

  function toPayload(dishToSave: Dish): DishPayload {
    return {
      id: dishToSave.id,
      name: dishToSave.name,
      split_mode: dishToSave.splitMode,
      cooked_weight_g: dishToSave.cookedWeightG,
      revision: dishToSave.revision,
      portions: dishToSave.portions.map((portion) => ({
        id: portion.id,
        user_id: portion.eater?.userId ?? null,
        date: portion.eater?.date ?? null,
        meal_type: portion.eater?.mealType ?? null,
        split_value: portion.splitValue,
      })),
      lines: dishToSave.lines.map((line) => ({
        ...line.item,
        id: line.id,
        allocation: line.allocation,
        amounts: Object.entries(line.amounts).map(([portion_id, amount]) => ({
          portion_id,
          amount,
        })),
      })) as unknown as LinePayload[],
    }
  }

  test.each([
    ['equal thirds with a leftover', 'equal', null, [null, null, null]],
    ['count 3 : 2', 'count', null, [3, 2, 0]],
    ['percent 45 / 35 / 20', 'percent', null, [45, 35, 20]],
    ['weight 517 g / 389 g of 1333 g', 'weight', 1333, [517, 389, 0]],
  ] as const)('%s', async (_name, splitMode, cookedWeightG, splitValues) => {
    // Arrange: per-100g, per-unit, unit converted to grams, and own amounts
    const [mine, hers, rest] = [uuid(), uuid(), uuid()]
    const eater = (user: TestUser) => ({ userId: user.id, date: DAY, mealType: 'dinner' as const })
    const portions: DishPortion[] = [
      { id: mine, eater: eater(alice), splitValue: splitValues[0] },
      { id: hers, eater: eater(bob), splitValue: splitValues[1] },
      { id: rest, eater: null, splitValue: splitValues[2] },
    ]
    const cooked: Dish = {
      id: uuid(),
      name: 'Parity',
      splitMode,
      cookedWeightG,
      revision: uuid(),
      portions,
      lines: [
        buildDishLine({
          id: uuid(),
          source: source('Rice', 351, null, null),
          unit: 'g',
          allocation: 'shared',
          amount: 333.33,
        }),
        buildDishLine({
          id: uuid(),
          source: source('Eggs', null, 78, 58),
          unit: 'unit',
          allocation: 'shared',
          amount: 7,
        }),
        buildDishLine({
          id: uuid(),
          source: source('Cheese', 402, null, 21),
          unit: 'unit',
          allocation: 'shared',
          amount: 3,
        }),
        buildDishLine({
          id: uuid(),
          source: source('Noodles', 357, null, null),
          unit: 'g',
          allocation: 'per_portion',
          amounts: { [mine]: 123.45, [hers]: 98.7, [rest]: 77 },
        }),
      ],
    }
    const expected = (portionId: string) =>
      Object.fromEntries(
        (portionItems(cooked).find((entry) => entry.portionId === portionId)?.items ?? []).map(
          ({ draft }) => [draft.name, [draft.entered_amount, draft.basis_multiplier]],
        ),
      )

    // Act
    const { error } = await saveDish(alice.client, toPayload(cooked))

    // Assert
    expect(error).toBeNull()
    expect(await dishItemsOf(alice, cooked.id, 'dinner')).toEqual(expected(mine))
    expect(await dishItemsOf(bob, cooked.id, 'dinner')).toEqual(expected(hers))
  })
})

describe('ingredients deleted meanwhile', () => {
  test('a line keeps its snapshot but loses the link (e.g. a save queued offline)', async () => {
    const { data: ingredient } = await alice.client
      .from('ingredients')
      .select('household_id')
      .eq('id', aliceIngredientId)
      .single()
    const created = await alice.client
      .from('ingredients')
      .insert({ household_id: ingredient!.household_id, name: 'Gone soon', kcal_100: 100 })
      .select('id')
      .single()
    await bob.client.from('ingredients').delete().eq('id', created.data!.id)
    const payload = withFreshPortionIds(
      dish({
        portions: [eats('a', alice)],
        lines: [{ ...sharedGrams('Gone soon', 100, 100), ingredient_id: created.data!.id }],
      }),
    )

    const { error } = await saveDish(alice.client, payload)
    const lines = await alice.client
      .from('dish_lines')
      .select('ingredient_id')
      .eq('dish_id', payload.id)

    expect(error).toBeNull()
    expect(lines.data).toEqual([{ ingredient_id: null }])
    expect(await dishItemsOf(alice, payload.id)).toEqual({ 'Gone soon': [100, 1] })
  })
})

describe('household boundaries', () => {
  test('a portion for someone outside the household is rejected', async () => {
    const payload = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('c', carol)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )

    const { error } = await saveDish(alice.client, payload)

    expect(error?.code).toBe('42501')
  })

  test('an ingredient of another household is rejected', async () => {
    const payload = withFreshPortionIds(
      dish({
        portions: [eats('a', alice)],
        lines: [{ ...sharedGrams('Secret', 100, 100), ingredient_id: carolIngredientId }],
      }),
    )

    const { error } = await saveDish(alice.client, payload)

    expect(error?.code).toBe('42501')
  })

  test('outsiders cannot see, overwrite or delete a dish', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)

    const seen = await carol.client.from('dishes').select('id').eq('id', chili.id)
    const lines = await carol.client.from('dish_lines').select('id').eq('dish_id', chili.id)
    const overwrite = await saveDish(
      carol.client,
      { ...chili, revision: uuid(), portions: [eats(uuid(), carol)] },
      chili.revision,
    )
    await carol.client.rpc('delete_dish', { p_dish_id: chili.id })

    expect(seen.data).toEqual([])
    expect(lines.data).toEqual([])
    expect(overwrite.error?.code).toBe('42501')
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [200, 2] })
  })

  test('items of another household cannot be moved into a dish', async () => {
    const mealId = await carol.client.rpc('ensure_meal', {
      p_user_id: carol.id,
      p_date: DAY,
      p_meal_type: 'lunch',
    })
    const itemId = uuid()
    await carol.client.from('meal_items').insert({
      id: itemId,
      meal_id: mealId.data,
      name: 'Cake',
      entered_amount: 100,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 1,
      kcal: 400,
    })
    const payload = withFreshPortionIds(
      dish({ portions: [eats('a', alice)], lines: [sharedGrams('Cake', 100, 400)] }),
    )

    const { error } = await saveDish(alice.client, payload, null, [itemId])
    const still = await carol.client.from('meal_items').select('id').eq('id', itemId)

    expect(error?.code).toBe('42501')
    expect(still.data).toHaveLength(1)
  })
})

describe('dish data is only written through save_dish', () => {
  test('dish tables cannot be written directly', async () => {
    const { error } = await alice.client
      .from('dishes')
      .insert({ id: uuid(), household_id: uuid(), revision: uuid() })

    expect(error?.code).toBe('42501')
  })

  test('a portion’s meal items cannot be changed, deleted or faked directly', async () => {
    const chili = withFreshPortionIds(
      dish({
        portions: [eats('a', alice), eats('b', bob)],
        lines: [sharedGrams('Mince', 400, 250)],
      }),
    )
    await saveDish(alice.client, chili)
    const portionId = chili.portions[0]!.id
    const { data: items } = await alice.client
      .from('meal_items')
      .select('id, meal_id')
      .eq('dish_portion_id', portionId)
    const target = items![0]!

    const update = await bob.client
      .from('meal_items')
      .update({ entered_amount: 999 })
      .eq('id', target.id)
      .select('id')
    const remove = await bob.client.from('meal_items').delete().eq('id', target.id).select('id')
    const fake = await alice.client.from('meal_items').insert({
      meal_id: target.meal_id,
      dish_portion_id: portionId,
      dish_line_id: chili.lines[0]!.id,
      name: 'Extra',
      entered_amount: 1,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 0.01,
      kcal: 1,
    })

    expect(update.data).toEqual([])
    expect(remove.data).toEqual([])
    expect(fake.error?.code).toBe('42501')
    expect(await dishItemsOf(alice, chili.id)).toEqual({ Mince: [200, 2] })
  })

  test('signed-out visitors see no dishes and cannot save one', async () => {
    const anon = anonClient()

    for (const name of ['dishes', 'dish_portions', 'dish_lines', 'dish_line_amounts']) {
      const { data } = await anon.from(name).select('*').limit(1)
      expect(data ?? [], name).toEqual([])
    }
    const { error } = await saveDish(anon, dish({}))
    expect(error).not.toBeNull()
  })
})

/** Portion ids are database keys: replace the short test ids ('a', 'b') with real uuids. */
function withFreshPortionIds(payload: DishPayload): DishPayload {
  const ids = new Map(payload.portions.map((portion) => [portion.id, uuid()]))
  const idOf = (id: string) => ids.get(id) ?? id
  return {
    ...payload,
    portions: payload.portions.map((portion) => ({ ...portion, id: idOf(portion.id) })),
    lines: payload.lines.map((line) => ({
      ...line,
      amounts: line.amounts.map((entry) => ({ ...entry, portion_id: idOf(entry.portion_id) })),
    })),
  }
}
