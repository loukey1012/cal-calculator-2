import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let aliceIngredientId: string
let carolIngredientId: string

type LinePayload = {
  readonly id: string
  readonly allocation: 'shared' | 'per_portion'
  readonly ingredient_id: string | null
  readonly name: string
  readonly brand: null
  readonly entered_amount: number
  readonly entered_unit: 'g'
  readonly basis: 'per_100g'
  readonly basis_multiplier: number
  readonly kcal: number
  readonly protein: null
  readonly carbs: null
  readonly sugar: null
  readonly fat: null
  readonly sat_fat: null
  readonly fiber: null
  readonly salt: null
  readonly amounts: ReadonlyArray<{ readonly portion_id: string; readonly amount: number }>
}

type RecipePayload = {
  readonly id: string
  readonly name: string
  readonly split_mode: 'equal' | 'count' | 'percent' | 'weight'
  readonly cooked_weight_g: number | null
  readonly kcal_estimated: boolean
  readonly portions: ReadonlyArray<{
    readonly id: string
    readonly user_id: string | null
    readonly split_value: number | null
  }>
  readonly lines: readonly LinePayload[]
}

const uuid = () => crypto.randomUUID()

function grams(name: string, amount: number, kcalPer100: number): LinePayload {
  return {
    id: uuid(),
    allocation: 'shared',
    ingredient_id: null,
    name,
    brand: null,
    entered_amount: amount,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: amount / 100,
    kcal: kcalPer100,
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

function recipe(overrides: Partial<RecipePayload>): RecipePayload {
  return {
    id: uuid(),
    name: 'Burger night',
    split_mode: 'equal',
    cooked_weight_g: null,
    kcal_estimated: false,
    portions: [{ id: uuid(), user_id: alice.id, split_value: null }],
    lines: [grams('Patty', 250, 240)],
    ...overrides,
  }
}

function saveRecipe(client: SupabaseClient, payload: RecipePayload) {
  return client.rpc('save_recipe', { p_recipe: payload })
}

async function recipeOf(client: SupabaseClient, recipeId: string) {
  const { data, error } = await client
    .from('recipes')
    .select(
      'name, recipe_portions(user_id, position), recipe_lines(name, recipe_line_amounts(amount))',
    )
    .eq('id', recipeId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')

  const household = await alice.client.rpc('create_household', { p_name: 'Recipes' })
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

describe('saving a recipe', () => {
  test('stores portions, lines and own amounts; the partner reads it', async () => {
    // Arrange
    const alicePortion = uuid()
    const bobPortion = uuid()
    const burger = recipe({
      portions: [
        { id: alicePortion, user_id: alice.id, split_value: null },
        { id: bobPortion, user_id: bob.id, split_value: null },
      ],
      lines: [
        { ...grams('Patty', 250, 240), ingredient_id: aliceIngredientId },
        {
          ...grams('Gouda', 50, 350),
          allocation: 'per_portion',
          amounts: [
            { portion_id: alicePortion, amount: 30 },
            { portion_id: bobPortion, amount: 20 },
          ],
        },
      ],
    })

    // Act
    const { error } = await saveRecipe(alice.client, burger)

    // Assert
    expect(error).toBeNull()
    const read = await recipeOf(bob.client, burger.id)
    expect(read?.name).toBe('Burger night')
    expect(read?.recipe_portions).toHaveLength(2)
    expect(read?.recipe_lines.map((line) => line.name).toSorted()).toEqual(['Gouda', 'Patty'])
    const gouda = read?.recipe_lines.find((line) => line.name === 'Gouda')
    expect(gouda?.recipe_line_amounts.map((a) => Number(a.amount)).toSorted()).toEqual([20, 30])
  })

  test('saving again replaces name and lines (the partner may change it)', async () => {
    // Arrange
    const soup = recipe({ name: 'Soup' })
    expect((await saveRecipe(alice.client, soup)).error).toBeNull()

    // Act
    const { error } = await saveRecipe(bob.client, {
      ...soup,
      name: '  Tomato soup ',
      lines: [grams('Tomato', 400, 18), grams('Cream', 50, 300)],
    })

    // Assert
    expect(error).toBeNull()
    const read = await recipeOf(alice.client, soup.id)
    expect(read?.name).toBe('Tomato soup')
    expect(read?.recipe_lines.map((line) => line.name).toSorted()).toEqual(['Cream', 'Tomato'])
  })

  test('a leftover portion has no person', async () => {
    const withLeftover = recipe({
      portions: [
        { id: uuid(), user_id: alice.id, split_value: null },
        { id: uuid(), user_id: null, split_value: null },
      ],
    })

    const { error } = await saveRecipe(alice.client, withLeftover)

    expect(error).toBeNull()
    const read = await recipeOf(alice.client, withLeftover.id)
    expect(read?.recipe_portions.map((p) => p.user_id).toSorted()).toEqual(
      [alice.id, null].toSorted(),
    )
  })

  test('needs a name and at least one ingredient', async () => {
    const unnamed = await saveRecipe(alice.client, recipe({ name: '  ' }))
    const empty = await saveRecipe(alice.client, recipe({ lines: [] }))

    expect(unnamed.error?.code).toBe('22023')
    expect(empty.error?.code).toBe('22023')
  })

  test('own amounts must add up to the line’s total', async () => {
    const portionId = uuid()
    const wrong = recipe({
      portions: [{ id: portionId, user_id: alice.id, split_value: null }],
      lines: [
        {
          ...grams('Gouda', 50, 350),
          allocation: 'per_portion',
          amounts: [{ portion_id: portionId, amount: 30 }],
        },
      ],
    })

    const { error } = await saveRecipe(alice.client, wrong)

    expect(error?.code).toBe('22023')
  })

  test('portions only go to household members; ingredients only from the household', async () => {
    const forCarol = recipe({ portions: [{ id: uuid(), user_id: carol.id, split_value: null }] })
    const foreign = recipe({
      lines: [{ ...grams('Secret', 100, 100), ingredient_id: carolIngredientId }],
    })

    const toStranger = await saveRecipe(alice.client, forCarol)
    const withForeign = await saveRecipe(alice.client, foreign)

    expect(toStranger.error?.code).toBe('42501')
    expect(withForeign.error?.code).toBe('42501')
  })
})

describe('who sees and changes recipes', () => {
  test("another household can't read or overwrite a recipe", async () => {
    // Arrange
    const secret = recipe({ name: 'Family secret' })
    expect((await saveRecipe(alice.client, secret)).error).toBeNull()

    // Act
    const read = await recipeOf(carol.client, secret.id)
    const overwrite = await saveRecipe(carol.client, {
      ...secret,
      portions: [{ id: uuid(), user_id: carol.id, split_value: null }],
    })

    // Assert
    expect(read).toBeNull()
    expect(overwrite.error?.code).toBe('42501')
    expect((await recipeOf(alice.client, secret.id))?.name).toBe('Family secret')
  })

  test('nobody writes the tables directly; signed-out visitors see nothing', async () => {
    const direct = await alice.client
      .from('recipes')
      .insert({ id: uuid(), household_id: uuid(), name: 'Sneaky' })
    const anon = await anonClient().from('recipes').select('id')

    expect(direct.error).not.toBeNull()
    expect(anon.data ?? []).toEqual([])
  })
})

describe('deleting a recipe', () => {
  test('the partner can delete it; another household cannot', async () => {
    // Arrange
    const first = recipe({ name: 'Delete me' })
    const second = recipe({ name: 'Keep me' })
    expect((await saveRecipe(alice.client, first)).error).toBeNull()
    expect((await saveRecipe(alice.client, second)).error).toBeNull()

    // Act
    const byBob = await bob.client.rpc('delete_recipe', { p_recipe_id: first.id })
    const byCarol = await carol.client.rpc('delete_recipe', { p_recipe_id: second.id })

    // Assert
    expect(byBob.error).toBeNull()
    expect(byCarol.error).toBeNull()
    expect(await recipeOf(alice.client, first.id)).toBeNull()
    expect((await recipeOf(alice.client, second.id))?.name).toBe('Keep me')
  })

  test('a deleted ingredient leaves the line with its snapshot', async () => {
    // Arrange
    const household = await alice.client
      .from('profiles')
      .select('household_id')
      .eq('id', alice.id)
      .single()
    const onion = await alice.client
      .from('ingredients')
      .insert({ household_id: household.data?.household_id, name: 'Onion', kcal_100: 40 })
      .select('id')
      .single()
    if (onion.error) throw new Error(onion.error.message)
    const withOnion = recipe({
      lines: [{ ...grams('Onion', 80, 40), ingredient_id: onion.data.id }],
    })
    expect((await saveRecipe(alice.client, withOnion)).error).toBeNull()

    // Act
    const removed = await alice.client.from('ingredients').delete().eq('id', onion.data.id)

    // Assert
    expect(removed.error).toBeNull()
    const line = await alice.client
      .from('recipe_lines')
      .select('name, ingredient_id, kcal')
      .eq('recipe_id', withOnion.id)
      .single()
    expect(line.data).toEqual({ name: 'Onion', ingredient_id: null, kcal: 40 })
  })
})
