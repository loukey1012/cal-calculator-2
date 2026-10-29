import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, createTestUser, deleteTestUsers, testCategory, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let householdId: string
let categoryId: string

const uuid = () => crypto.randomUUID()

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  const household = await alice.client.rpc('create_household', { p_name: 'Merging' })
  if (household.error) throw new Error(household.error.message)
  householdId = household.data.id
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Elsewhere' })
  if (other.error) throw new Error(other.error.message)
  categoryId = await testCategory(householdId)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

async function ingredient(fields: Record<string, unknown>): Promise<string> {
  const { data, error } = await alice.client
    .from('ingredients')
    .insert({ household_id: householdId, category_id: categoryId, ...fields })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

describe('merge_ingredients', () => {
  test('the kept one takes the chosen values and the barcode; everything moves to it', async () => {
    // Arrange: Toastkäse is kept, Toast-Käsescheiben (with a barcode) merged into it
    const keep = await ingredient({ name: 'Toastkäse', kcal_100: 300 })
    const drop = await ingredient({
      name: 'Toast-Käsescheiben',
      kcal_100: 310,
      unit_label: 'slice',
      unit_weight_g: 20,
      barcode: '4012345678901',
    })
    const meal = await alice.client.rpc('ensure_meal', {
      p_user_id: alice.id,
      p_date: '2026-10-07',
      p_meal_type: 'lunch',
    })
    const item = await alice.client
      .from('meal_items')
      .insert({
        meal_id: meal.data,
        ingredient_id: drop,
        name: 'Toast-Käsescheiben',
        entered_amount: 40,
        entered_unit: 'g',
        basis: 'per_100g',
        basis_multiplier: 0.4,
        kcal: 124,
      })
      .select('id')
      .single()
    const finding = await admin
      .from('review_findings')
      .insert({
        household_id: householdId,
        ingredient_id: keep,
        kind: 'duplicate',
        message: 'Same as "Toast-Käsescheiben".',
        suggestion: { duplicate_of: drop },
        run_id: 'test',
      })
      .select('id')
      .single()

    // Act
    const { error } = await bob.client.rpc('merge_ingredients', {
      p_keep: keep,
      p_drop: drop,
      p_patch: { unit_label: 'slice', unit_weight_g: 20, household_id: uuid() },
      p_finding: finding.data?.id,
    })

    // Assert
    expect(error).toBeNull()
    const kept = await alice.client.from('ingredients').select('*').eq('id', keep).single()
    expect(kept.data).toMatchObject({
      name: 'Toastkäse',
      kcal_100: 300,
      unit_label: 'slice',
      unit_weight_g: 20,
      barcode: '4012345678901',
      household_id: householdId,
    })
    const gone = await alice.client.from('ingredients').select('id').eq('id', drop)
    expect(gone.data).toEqual([])
    const moved = await alice.client
      .from('meal_items')
      .select('ingredient_id, kcal')
      .eq('id', item.data?.id as string)
      .single()
    expect(moved.data).toEqual({ ingredient_id: keep, kcal: 124 })
    const decided = await alice.client
      .from('review_findings')
      .select('status, decided_by')
      .eq('id', finding.data?.id as string)
      .single()
    expect(decided.data).toEqual({ status: 'applied', decided_by: bob.id })
  })

  test('a barcode taken over from the other one does not clash', async () => {
    const keep = await ingredient({ name: 'Thunfisch', kcal_100: 110, barcode: '4000000000017' })
    const drop = await ingredient({
      name: 'Thunfisch klein',
      kcal_100: 110,
      barcode: '4000000000024',
    })

    const { error } = await alice.client.rpc('merge_ingredients', {
      p_keep: keep,
      p_drop: drop,
      p_patch: { barcode: '4000000000024' },
      p_finding: null,
    })

    expect(error).toBeNull()
    const kept = await alice.client.from('ingredients').select('barcode').eq('id', keep).single()
    expect(kept.data).toEqual({ barcode: '4000000000024' })
  })

  test('an ingredient is not merged with itself', async () => {
    const one = await ingredient({ name: 'Skyr', kcal_100: 63 })

    const { error } = await alice.client.rpc('merge_ingredients', {
      p_keep: one,
      p_drop: one,
      p_patch: {},
      p_finding: null,
    })

    expect(error?.code).toBe('22023')
  })

  test('another household cannot merge them', async () => {
    const keep = await ingredient({ name: 'Edamer', kcal_100: 330 })
    const drop = await ingredient({ name: 'Edamer Scheiben', kcal_100: 330 })

    const { error } = await carol.client.rpc('merge_ingredients', {
      p_keep: keep,
      p_drop: drop,
      p_patch: {},
      p_finding: null,
    })

    expect(error?.code).toBe('42501')
    const still = await alice.client.from('ingredients').select('id').in('id', [keep, drop])
    expect(still.data).toHaveLength(2)
  })
})
