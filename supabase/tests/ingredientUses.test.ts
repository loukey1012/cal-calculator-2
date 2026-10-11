import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let pattyId: string
let saladId: string

const DAY = '2026-10-03'
const uuid = () => crypto.randomUUID()

function line(ingredientId: string) {
  return {
    id: uuid(),
    allocation: 'shared',
    ingredient_id: ingredientId,
    name: 'Line',
    brand: null,
    entered_amount: 100,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 1,
    kcal: 200,
    protein: null,
    carbs: null,
    sugar: null,
    fat: null,
    sat_fat: null,
    fiber: null,
    salt: null,
    amounts: [],
  }
}

function portion(user: TestUser) {
  return { id: uuid(), user_id: user.id, date: DAY, meal_type: 'dinner', split_value: null }
}

async function usesOf(user: TestUser): Promise<Record<string, number>> {
  const { data, error } = await user.client.rpc('ingredient_use_counts')
  if (error) throw new Error(error.message)
  const rows = data as ReadonlyArray<{ readonly ingredient_id: string; readonly uses: number }>
  return Object.fromEntries(rows.map((row) => [row.ingredient_id, row.uses]))
}

beforeAll(async () => {
  alice = await createTestUser('alice-uses')
  bob = await createTestUser('bob-uses')
  carol = await createTestUser('carol-uses')
  const household = await alice.client.rpc('create_household', { p_name: 'Uses' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Other' })
  if (other.error) throw new Error(other.error.message)

  const created = await alice.client
    .from('ingredients')
    .insert([
      { household_id: household.data.id, name: 'Patty', kcal_100: 240 },
      { household_id: household.data.id, name: 'Salad', kcal_100: 15 },
    ])
    .select('id, name')
  if (created.error) throw new Error(created.error.message)
  pattyId = created.data.find((row) => row.name === 'Patty')!.id
  saladId = created.data.find((row) => row.name === 'Salad')!.id

  // a dish for both: Patty once although two people eat it
  const saved = await alice.client.rpc('save_dish', {
    p_dish: {
      id: uuid(),
      name: 'Burger',
      split_mode: 'equal',
      cooked_weight_g: null,
      revision: uuid(),
      portions: [portion(alice), portion(bob)],
      lines: [line(pattyId)],
    },
    p_base_revision: null,
    p_replace_item_ids: [],
  })
  if (saved.error) throw new Error(saved.error.message)

  // Patty logged once more as a single food, without a dish
  const meal = await bob.client.rpc('ensure_meal', {
    p_user_id: bob.id,
    p_date: DAY,
    p_meal_type: 'lunch',
  })
  if (meal.error) throw new Error(meal.error.message)
  const { amounts: _amounts, allocation: _allocation, id: _id, ...item } = line(pattyId)
  const logged = await bob.client.from('meal_items').insert({ ...item, meal_id: meal.data })
  if (logged.error) throw new Error(logged.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('ingredient_use_counts', () => {
  test('a dish line counts once, a single logged food once; unused ingredients are missing', async () => {
    const uses = await usesOf(alice)

    expect(uses[pattyId]).toBe(2)
    expect(uses[saladId]).toBeUndefined()
  })

  test('the household partner sees the same counts', async () => {
    expect((await usesOf(bob))[pattyId]).toBe(2)
  })

  test('another household sees nothing of it', async () => {
    expect(await usesOf(carol)).toEqual({})
  })
})
