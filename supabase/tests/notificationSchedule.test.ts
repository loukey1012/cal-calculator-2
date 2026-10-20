import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household.
let alice: TestUser
let bob: TestUser

const DAY = '2026-10-06'

async function changesFor(user: TestUser) {
  const { data, error } = await admin
    .from('partner_changes')
    .select('actor_id, date, meal_type')
    .eq('user_id', user.id)
    .order('meal_type')
  if (error) throw new Error(error.message)
  return data
}

async function logItem(by: TestUser, owner: TestUser, mealType: string, date = DAY) {
  const meal = await by.client.rpc('ensure_meal', {
    p_user_id: owner.id,
    p_date: date,
    p_meal_type: mealType,
  })
  if (meal.error) throw new Error(meal.error.message)
  const item = await by.client
    .from('meal_items')
    .insert({
      meal_id: meal.data,
      name: 'Apple',
      entered_amount: 150,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 1.5,
      kcal: 52,
    })
    .select('id')
    .single()
  if (item.error) throw new Error(item.error.message)
  return { mealId: meal.data as string, itemId: item.data.id }
}

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  const household = await alice.client.rpc('create_household', { p_name: 'Notified' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob].filter(Boolean))
})

describe('partner changes', () => {
  test('food the partner logs in my meal waits to be told; my own food does not', async () => {
    // Act
    await logItem(bob, alice, 'lunch')
    await logItem(alice, alice, 'dinner')

    // Assert
    expect(await changesFor(alice)).toEqual([{ actor_id: bob.id, date: DAY, meal_type: 'lunch' }])
    expect(await changesFor(bob)).toEqual([])
  })

  test('changing or deleting it again keeps one row per meal', async () => {
    // Arrange
    const { itemId } = await logItem(bob, alice, 'breakfast')

    // Act
    await bob.client.from('meal_items').update({ entered_amount: 200 }).eq('id', itemId)
    await bob.client.from('meal_items').delete().eq('id', itemId)

    // Assert
    const breakfast = (await changesFor(alice)).filter((row) => row.meal_type === 'breakfast')
    expect(breakfast).toHaveLength(1)
  })

  test('a cheat meal set by the partner counts too', async () => {
    const otherDay = '2026-10-07'

    const { error } = await bob.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: otherDay,
      p_meal_type: 'snack',
      p_cheat_meal: true,
    })

    expect(error).toBeNull()
    const { data } = await admin
      .from('partner_changes')
      .select('meal_type')
      .eq('user_id', alice.id)
      .eq('date', otherDay)
    expect(data).toEqual([{ meal_type: 'snack' }])
  })
})

describe('settings and logs', () => {
  test('I save my notification settings and time zone; the partner neither sees nor sets them', async () => {
    // Arrange
    const settings = { partnerChanges: false }

    // Act
    const saved = await alice.client
      .from('notification_preferences')
      .upsert({ user_id: alice.id, settings, time_zone: 'Europe/Vienna' })
      .select('settings, time_zone')
    const changedAgain = await alice.client
      .from('notification_preferences')
      .upsert({ user_id: alice.id, settings: {}, time_zone: 'Europe/Vienna' })
      .select('settings')
    const seenByPartner = await bob.client
      .from('notification_preferences')
      .select('user_id')
      .eq('user_id', alice.id)
    const setByPartner = await bob.client
      .from('notification_preferences')
      .insert({ user_id: alice.id, settings })

    // Assert
    expect(saved.data).toEqual([{ settings, time_zone: 'Europe/Vienna' }])
    expect(changedAgain.data).toEqual([{ settings: {} }])
    expect(seenByPartner.data).toEqual([])
    expect(setByPartner.error).not.toBeNull()
  })

  test('settings must be an object', async () => {
    const { error } = await alice.client
      .from('notification_preferences')
      .update({ settings: [1, 2] })
      .eq('user_id', alice.id)

    expect(error?.code).toBe('23514')
  })

  test('members never see the sent-log or the waiting changes', async () => {
    const sent = await alice.client.from('push_sent').select('*')
    const waiting = await alice.client.from('partner_changes').select('*')

    expect(sent.error).not.toBeNull()
    expect(waiting.error).not.toBeNull()
  })
})
