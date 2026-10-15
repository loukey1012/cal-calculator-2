import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let butterId: string

const MARKED = { kcal_100: 740, fat_100: 20, sat_fat_100: 50 }

beforeAll(async () => {
  alice = await createTestUser('alice-ok')
  bob = await createTestUser('bob-ok')
  carol = await createTestUser('carol-ok')
  const household = await alice.client.rpc('create_household', { p_name: 'Values ok' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Other' })
  if (other.error) throw new Error(other.error.message)
  const created = await alice.client
    .from('ingredients')
    .insert({ household_id: household.data.id, name: 'Butter', ...MARKED })
    .select('id')
    .single()
  if (created.error) throw new Error(created.error.message)
  butterId = created.data.id
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('ingredients.values_ok', () => {
  test('is empty for a new ingredient', async () => {
    const { data } = await alice.client
      .from('ingredients')
      .select('values_ok')
      .eq('id', butterId)
      .single()

    expect(data?.values_ok).toBeNull()
  })

  test('either member can mark the values as correct, and both see it', async () => {
    const marked = await bob.client
      .from('ingredients')
      .update({ values_ok: MARKED })
      .eq('id', butterId)
      .select('values_ok')
      .single()
    expect(marked.error).toBeNull()

    const { data } = await alice.client
      .from('ingredients')
      .select('values_ok')
      .eq('id', butterId)
      .single()
    expect(data?.values_ok).toEqual(MARKED)
  })

  test('another household can’t mark it', async () => {
    const { data } = await carol.client
      .from('ingredients')
      .update({ values_ok: null })
      .eq('id', butterId)
      .select('id')

    expect(data).toEqual([])
  })
})
