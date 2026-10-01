import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another household; Dave has no household.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let dave: TestUser
let householdId: string
let inviteCode: string
let carolHouseholdId: string

const LOG_DATE = '2026-10-01'

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  dave = await createTestUser('dave')
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol, dave].filter(Boolean))
})

describe('profiles', () => {
  test('a profile is created automatically on sign-up, using the display name', async () => {
    const { data, error } = await alice.client
      .from('profiles')
      .select('*')
      .eq('id', alice.id)
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({ id: alice.id, display_name: 'alice', household_id: null })
  })

  test('a user can update their own display name and accent color', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ display_name: 'Alice', accent_color: '#ff2d55' })
      .eq('id', alice.id)

    expect(error).toBeNull()
  })

  test('accent color must be a hex color', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ accent_color: 'red' })
      .eq('id', alice.id)

    expect(error?.code).toBe('23514')
  })
})

describe('households', () => {
  test('create_household puts the caller into a new household with an invite code', async () => {
    const { data, error } = await alice.client.rpc('create_household', { p_name: 'Home' })

    expect(error).toBeNull()
    expect(data).toMatchObject({ name: 'Home' })
    // 12 chars, no look-alikes (I/O/0/1) so it can be read out and typed easily
    expect(data.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
    householdId = data.id
    inviteCode = data.invite_code
  })

  test('creating a second household while already in one is rejected', async () => {
    const { error } = await alice.client.rpc('create_household', { p_name: 'Other' })

    expect(error?.message).toMatch(/already in a household/i)
  })

  test('join_household with a wrong code is rejected', async () => {
    const { error } = await bob.client.rpc('join_household', { p_invite_code: 'WRONG000' })

    expect(error?.message).toMatch(/invalid invite code/i)
  })

  test('join_household with the right code (any case) joins the household', async () => {
    const { data, error } = await bob.client.rpc('join_household', {
      p_invite_code: inviteCode.toLowerCase(),
    })

    expect(error).toBeNull()
    expect(data.id).toBe(householdId)
  })

  test('carol creates her own separate household', async () => {
    const { data, error } = await carol.client.rpc('create_household', { p_name: 'Carol home' })

    expect(error).toBeNull()
    carolHouseholdId = data.id
  })

  test('outsiders cannot see the household or its invite code', async () => {
    const { data } = await carol.client.from('households').select('*').eq('id', householdId)

    expect(data).toEqual([])
  })

  test('a user cannot move themselves into another household by editing their profile', async () => {
    const { error } = await carol.client
      .from('profiles')
      .update({ household_id: householdId })
      .eq('id', carol.id)

    expect(error?.code).toBe('42501')
  })

  test('members see each other’s profiles; outsiders do not', async () => {
    const { data: bobSees } = await bob.client.from('profiles').select('id')
    const { data: carolSees } = await carol.client.from('profiles').select('id')

    expect(bobSees?.map((p: { id: string }) => p.id).sort()).toEqual([alice.id, bob.id].sort())
    expect(carolSees?.map((p: { id: string }) => p.id)).toEqual([carol.id])
  })
})

describe('goals', () => {
  test('a user sets their own goals; household members can read them', async () => {
    const { error } = await alice.client
      .from('goal_history')
      .insert({ user_id: alice.id, valid_from: '2026-09-01', kcal: 2000, protein_g: 120 })
    const { data: bobSees } = await bob.client
      .from('goal_history')
      .select('kcal')
      .eq('user_id', alice.id)
    const { data: carolSees } = await carol.client.from('goal_history').select('kcal')

    expect(error).toBeNull()
    expect(bobSees).toEqual([{ kcal: 2000 }])
    expect(carolSees).toEqual([])
  })

  test('nobody can set goals for another user', async () => {
    const { error } = await bob.client
      .from('goal_history')
      .insert({ user_id: alice.id, valid_from: '2026-10-01', kcal: 1500 })

    expect(error?.code).toBe('42501')
  })
})

describe('ingredients', () => {
  test('per-100g only ingredient with only calories is valid', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: '7% cream', brand: 'Milbona', kcal_100: 92 })

    expect(error).toBeNull()
  })

  test('per-unit only ingredient with grams per unit is valid', async () => {
    const { error } = await bob.client.from('ingredients').insert({
      household_id: householdId,
      name: 'Protein bar',
      unit_label: 'bar',
      unit_weight_g: 60,
      kcal_unit: 210,
      protein_unit: 20,
    })

    expect(error).toBeNull()
  })

  test('an ingredient without any calorie value is rejected', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'No kcal', protein_100: 5 })

    expect(error?.code).toBe('23514')
  })

  test('per-unit nutrients without per-unit calories are rejected', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Half unit', kcal_100: 100, protein_unit: 3 })

    expect(error?.code).toBe('23514')
  })

  test('calories must be whole numbers', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Decimal', kcal_100: 92.5 })

    expect(error?.code).toBe('22P02')
  })

  test('negative nutrient values are rejected', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Negative', kcal_100: 10, fat_100: -1 })

    expect(error?.code).toBe('23514')
  })

  test('more than 100 g of a nutrient per 100 g is rejected', async () => {
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Typo', kcal_100: 400, protein_100: 250 })

    expect(error?.code).toBe('23514')
  })

  test('legacy ids are unique per household, not globally', async () => {
    const legacy = { legacy_id: 'firebase-doc-1', name: 'Imported', kcal_100: 50 }
    const mine = await alice.client
      .from('ingredients')
      .insert({ ...legacy, household_id: householdId })
    const dupe = await bob.client
      .from('ingredients')
      .insert({ ...legacy, household_id: householdId })
    const other = await carol.client
      .from('ingredients')
      .insert({ ...legacy, household_id: carolHouseholdId })

    expect(mine.error).toBeNull()
    expect(dupe.error?.code).toBe('23505')
    expect(other.error).toBeNull()
  })

  test('outsiders can neither read nor add to the household’s ingredients', async () => {
    const { data } = await carol.client
      .from('ingredients')
      .select('id')
      .eq('household_id', householdId)
    const { error } = await carol.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Intruder', kcal_100: 1 })

    expect(data).toEqual([])
    expect(error?.code).toBe('42501')
  })

  test('category names are unique per household, case-insensitively', async () => {
    const first = await alice.client
      .from('categories')
      .insert({ household_id: householdId, name: 'Dairy' })
    const dupe = await bob.client
      .from('categories')
      .insert({ household_id: householdId, name: 'dairy' })

    expect(first.error).toBeNull()
    expect(dupe.error?.code).toBe('23505')
  })
})

describe('empty categories', () => {
  async function categoryNamed(name: string) {
    const { data } = await alice.client
      .from('categories')
      .insert({ household_id: householdId, name })
      .select('id')
      .single()
    return data?.id as string
  }

  async function ingredientIn(categoryId: string, name: string) {
    const { data } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, category_id: categoryId, name, kcal_100: 1 })
      .select('id')
      .single()
    return data?.id as string
  }

  async function categoryExists(id: string) {
    const { data } = await alice.client.from('categories').select('id').eq('id', id)
    return (data ?? []).length === 1
  }

  test('deleting the last ingredient of a category removes the category', async () => {
    const categoryId = await categoryNamed('Temp A')
    const ingredientId = await ingredientIn(categoryId, 'Only one')

    await bob.client.from('ingredients').delete().eq('id', ingredientId)

    expect(await categoryExists(categoryId)).toBe(false)
  })

  test('a category that still has ingredients is kept', async () => {
    const categoryId = await categoryNamed('Temp B')
    const first = await ingredientIn(categoryId, 'First')
    await ingredientIn(categoryId, 'Second')

    await alice.client.from('ingredients').delete().eq('id', first)

    expect(await categoryExists(categoryId)).toBe(true)
  })

  test('moving the last ingredient to another category removes the emptied one', async () => {
    const from = await categoryNamed('Temp C')
    const to = await categoryNamed('Temp D')
    const ingredientId = await ingredientIn(from, 'Mover')

    await alice.client.from('ingredients').update({ category_id: to }).eq('id', ingredientId)

    expect(await categoryExists(from)).toBe(false)
    expect(await categoryExists(to)).toBe(true)
  })
})

describe('meals', () => {
  let aliceLunchId: string

  test('ensure_meal creates the meal once and then returns the same id', async () => {
    const args = { p_user_id: alice.id, p_date: LOG_DATE, p_meal_type: 'lunch' }
    const first = await alice.client.rpc('ensure_meal', args)
    const second = await alice.client.rpc('ensure_meal', args)

    expect(first.error).toBeNull()
    expect(second.data).toBe(first.data)
    aliceLunchId = first.data
  })

  test('a second lunch for the same user and day cannot be inserted directly', async () => {
    const { error } = await alice.client
      .from('meals')
      .insert({ user_id: alice.id, date: LOG_DATE, meal_type: 'lunch' })

    expect(error?.code).toBe('23505')
  })

  test('a household member can add items to another member’s meal', async () => {
    const { error } = await bob.client.from('meal_items').insert([
      {
        meal_id: aliceLunchId,
        name: '7% cream',
        entered_amount: 150,
        entered_unit: 'g',
        basis: 'per_100g',
        basis_multiplier: 1.5,
        kcal: 92,
        protein: 1.3,
      },
      {
        meal_id: aliceLunchId,
        name: 'Quick custom snack',
        entered_amount: 2,
        entered_unit: 'unit',
        basis: 'per_unit',
        basis_multiplier: 2,
        kcal: 200,
      },
    ])

    expect(error).toBeNull()
  })

  test('meal_totals sums items and flags nutrients missing on some items', async () => {
    const { data, error } = await alice.client
      .from('meal_totals')
      .select('*')
      .eq('meal_id', aliceLunchId)
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      user_id: alice.id,
      date: LOG_DATE,
      meal_type: 'lunch',
      item_count: 2,
    })
    expect(Number(data.kcal)).toBeCloseTo(538)
    expect(Number(data.protein)).toBeCloseTo(1.95)
    expect(data.protein_missing).toBe(true)
  })

  test('daily_totals sums all meals of the day', async () => {
    const { data, error } = await bob.client
      .from('daily_totals')
      .select('*')
      .eq('user_id', alice.id)
      .eq('date', LOG_DATE)
      .single()

    expect(error).toBeNull()
    expect(Number(data.kcal)).toBeCloseTo(538)
    expect(data.meal_count).toBe(1)
  })

  test('a household member can edit and delete items in another member’s meal', async () => {
    const { data: items } = await bob.client
      .from('meal_items')
      .select('id')
      .eq('meal_id', aliceLunchId)
    const target = items?.[1]?.id
    const update = await bob.client
      .from('meal_items')
      .update({ basis_multiplier: 1 })
      .eq('id', target)
    const remove = await bob.client.from('meal_items').delete().eq('id', target).select('id')

    expect(update.error).toBeNull()
    expect(remove.data).toHaveLength(1)
  })

  test('meal item calories snapshot must be a whole number', async () => {
    const { error } = await alice.client.from('meal_items').insert({
      meal_id: aliceLunchId,
      name: 'Bad',
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal: 10.5,
    })

    expect(error?.code).toBe('22P02')
  })

  test('outsiders cannot see, create or modify the household’s meals', async () => {
    const seen = await carol.client.from('meals').select('id').eq('user_id', alice.id)
    const totals = await carol.client.from('daily_totals').select('*').eq('user_id', alice.id)
    const ensured = await carol.client.rpc('ensure_meal', {
      p_user_id: alice.id,
      p_date: LOG_DATE,
      p_meal_type: 'dinner',
    })
    const itemInsert = await carol.client.from('meal_items').insert({
      meal_id: aliceLunchId,
      name: 'Intruder',
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal: 1,
    })

    expect(seen.data).toEqual([])
    expect(totals.data).toEqual([])
    expect(ensured.error?.code).toBe('42501')
    expect(itemInsert.error?.code).toBe('42501')
  })

  test('meal items cannot reference another household’s ingredient', async () => {
    const { data: carolsIngredient } = await carol.client
      .from('ingredients')
      .insert({ household_id: carolHouseholdId, name: 'Carol secret', kcal_100: 10 })
      .select('id')
      .single()
    const { error } = await alice.client.from('meal_items').insert({
      meal_id: aliceLunchId,
      ingredient_id: carolsIngredient?.id,
      name: 'Borrowed',
      entered_amount: 100,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 1,
      kcal: 10,
    })

    expect(carolsIngredient?.id).toBeDefined()
    expect(error?.code).toBe('42501')
  })

  test('a user without a household cannot log meals, even for themselves', async () => {
    const { error } = await dave.client.rpc('ensure_meal', {
      p_user_id: dave.id,
      p_date: LOG_DATE,
      p_meal_type: 'breakfast',
    })

    expect(error?.code).toBe('42501')
  })
})

describe('anonymous access', () => {
  test('signed-out visitors see nothing in any table or view', async () => {
    const anon = anonClient()
    const relations = [
      'households',
      'profiles',
      'goal_history',
      'categories',
      'ingredients',
      'meals',
      'meal_items',
      'meal_totals',
      'daily_totals',
    ]

    for (const name of relations) {
      const { data } = await anon.from(name).select('*').limit(1)
      expect(data ?? [], name).toEqual([])
    }
  })

  test('sanity check via service role: the logged meal really exists', async () => {
    const { count } = await admin
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', alice.id)

    expect(count).toBe(1)
  })
})
