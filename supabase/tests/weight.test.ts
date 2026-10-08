import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  const household = await alice.client.rpc('create_household', { p_name: 'Scales' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Elsewhere' })
  if (other.error) throw new Error(other.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('weight entries', () => {
  test('one weight per person and day: saving the day again replaces it', async () => {
    const first = await alice.client.from('weight_entries').upsert(
      { user_id: alice.id, date: '2026-10-01', weight_kg: 72.4 },
      {
        onConflict: 'user_id,date',
      },
    )
    const again = await alice.client.from('weight_entries').upsert(
      { user_id: alice.id, date: '2026-10-01', weight_kg: 72.1 },
      {
        onConflict: 'user_id,date',
      },
    )
    const { data } = await alice.client
      .from('weight_entries')
      .select('date, weight_kg')
      .eq('user_id', alice.id)

    expect(first.error).toBeNull()
    expect(again.error).toBeNull()
    expect(data).toEqual([{ date: '2026-10-01', weight_kg: 72.1 }])
  })

  test.each([19.9, 400.1, -1])('a weight of %s kg is rejected', async (weight) => {
    const { error } = await alice.client
      .from('weight_entries')
      .insert({ user_id: alice.id, date: '2026-09-01', weight_kg: weight })

    expect(error?.code).toBe('23514')
  })

  test('the household sees each other’s weight; outsiders and visitors see nothing', async () => {
    const bobSees = await bob.client
      .from('weight_entries')
      .select('weight_kg')
      .eq('user_id', alice.id)
    const carolSees = await carol.client.from('weight_entries').select('weight_kg')
    const visitorSees = await anonClient().from('weight_entries').select('weight_kg')

    expect(bobSees.data).toEqual([{ weight_kg: 72.1 }])
    expect(carolSees.data).toEqual([])
    expect(visitorSees.data ?? []).toEqual([])
  })

  test('only you can add, change or delete your weight', async () => {
    const insert = await bob.client
      .from('weight_entries')
      .insert({ user_id: alice.id, date: '2026-10-05', weight_kg: 50 })
    await bob.client.from('weight_entries').update({ weight_kg: 50 }).eq('user_id', alice.id)
    await bob.client.from('weight_entries').delete().eq('user_id', alice.id)
    const { data } = await alice.client
      .from('weight_entries')
      .select('weight_kg')
      .eq('user_id', alice.id)

    expect(insert.error?.code).toBe('42501')
    expect(data).toEqual([{ weight_kg: 72.1 }])
  })

  test('a target weight can be part of the goal', async () => {
    const goal = await alice.client
      .from('goal_history')
      .insert({ user_id: alice.id, valid_from: '2026-10-01', kcal: 2000, weight_goal_kg: 68 })
      .select('weight_goal_kg')
      .single()
    const odd = await alice.client
      .from('goal_history')
      .insert({ user_id: alice.id, valid_from: '2026-10-02', kcal: 2000, weight_goal_kg: 5 })

    expect(goal.data).toEqual({ weight_goal_kg: 68 })
    expect(odd.error?.code).toBe('23514')
  })
})
