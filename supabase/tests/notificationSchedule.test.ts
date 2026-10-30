import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household.
let alice: TestUser
let bob: TestUser

const DAY = '2026-10-06'

async function changesFor(user: TestUser, date?: string) {
  const { data, error } = await admin
    .from('partner_changes')
    .select('actor_id, date, kind, subject, before')
    .eq('user_id', user.id)
    .order('kind')
    .order('subject')
    .match(date ? { date } : {})
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
    expect(await changesFor(alice, DAY)).toEqual([
      { actor_id: bob.id, date: DAY, kind: 'meal', subject: 'lunch', before: null },
    ])
    expect(await changesFor(bob, DAY)).toEqual([])
  })

  test('changing or deleting it again keeps one row per meal', async () => {
    // Arrange
    const day = '2026-10-14'
    const { itemId } = await logItem(bob, alice, 'breakfast', day)

    // Act
    await bob.client.from('meal_items').update({ entered_amount: 200 }).eq('id', itemId)
    await bob.client.from('meal_items').delete().eq('id', itemId)

    // Assert
    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'meal', subject: 'breakfast', before: null },
    ])
  })

  test('a cheat meal set by the partner counts as a flag that was off', async () => {
    const otherDay = '2026-10-07'

    const { error } = await bob.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: otherDay,
      p_meal_type: 'snack',
      p_cheat_meal: true,
    })

    expect(error).toBeNull()
    expect(await changesFor(alice, otherDay)).toEqual([
      {
        actor_id: bob.id,
        date: otherDay,
        kind: 'flag',
        subject: 'cheat_meal:snack',
        before: 'off',
      },
    ])
  })

  test('a cheat day switched to an alcohol day stays one flag with the first value before', async () => {
    const day = '2026-10-08'
    const set = (kind: string) =>
      bob.client
        .from('cheat_days')
        .upsert({ user_id: alice.id, date: day, kind }, { onConflict: 'user_id,date' })

    await set('cheat')
    await set('alcohol')

    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'flag', subject: 'day_mark', before: 'none' },
    ])
  })

  test('sending the same kind of day again notes nothing', async () => {
    const day = '2026-10-15'
    await admin.from('cheat_days').insert({ user_id: alice.id, date: day, kind: 'alcohol' })

    const again = await bob.client
      .from('cheat_days')
      .upsert({ user_id: alice.id, date: day, kind: 'alcohol' }, { onConflict: 'user_id,date' })

    expect(again.error).toBeNull()
    expect(await changesFor(alice, day)).toEqual([])
  })

  test('taking a cheat day back is a flag that was on its kind', async () => {
    const day = '2026-10-16'
    await admin.from('cheat_days').insert({ user_id: alice.id, date: day, kind: 'alcohol' })

    await bob.client.from('cheat_days').delete().eq('user_id', alice.id).eq('date', day)

    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'flag', subject: 'day_mark', before: 'alcohol' },
    ])
  })

  test("the partner's day note: write, same text, change, remove gives one note row", async () => {
    const day = '2026-10-09'
    const dayNotes = bob.client.from('day_notes')

    const written = await dayNotes.insert({ user_id: alice.id, date: day, note: 'Hello' })
    const wrote = await changesFor(alice, day)
    await admin.from('partner_changes').delete().eq('user_id', alice.id).eq('date', day)
    const same = await bob.client
      .from('day_notes')
      .update({ note: 'Hello' })
      .eq('user_id', alice.id)
      .eq('date', day)
    const afterSame = await changesFor(alice, day)
    await bob.client
      .from('day_notes')
      .update({ note: 'Hi' })
      .eq('user_id', alice.id)
      .eq('date', day)
    await bob.client.from('day_notes').delete().eq('user_id', alice.id).eq('date', day)

    expect(written.error).toBeNull()
    expect(wrote).toHaveLength(1)
    expect(same.error).toBeNull()
    expect(afterSame).toEqual([])
    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'note', subject: 'day', before: null },
    ])
  })

  test("the partner's meal note is a note on that meal and no meal change", async () => {
    const day = '2026-10-10'

    const { error } = await bob.client.rpc('set_meal_note', {
      p_user_id: alice.id,
      p_date: day,
      p_meal_type: 'dinner',
      p_note: 'Too salty',
    })

    expect(error).toBeNull()
    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'note', subject: 'dinner', before: null },
    ])
  })

  test("the partner's gym day is a flag that was off", async () => {
    const day = '2026-10-11'

    await bob.client.from('gym_days').insert({ user_id: alice.id, date: day })

    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'flag', subject: 'gym', before: 'off' },
    ])
  })

  test("the partner's gym day taken back and set again keeps the first value before", async () => {
    const day = '2026-10-17'
    await admin.from('gym_days').insert({ user_id: alice.id, date: day })

    await bob.client.from('gym_days').delete().eq('user_id', alice.id).eq('date', day)
    await bob.client.from('gym_days').insert({ user_id: alice.id, date: day })

    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'flag', subject: 'gym', before: 'on' },
    ])
  })

  test('the partner removing a meal note is a note on that meal', async () => {
    const day = '2026-10-18'
    await admin
      .from('meals')
      .insert({ user_id: alice.id, date: day, meal_type: 'lunch', note: 'Salty' })

    const { error } = await bob.client.rpc('set_meal_note', {
      p_user_id: alice.id,
      p_date: day,
      p_meal_type: 'lunch',
      p_note: '',
    })

    expect(error).toBeNull()
    expect(await changesFor(alice, day)).toEqual([
      { actor_id: bob.id, date: day, kind: 'note', subject: 'lunch', before: null },
    ])
  })

  test('my own changes on every table note nothing', async () => {
    const day = '2026-10-12'

    await logItem(alice, alice, 'lunch', day)
    await alice.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: day,
      p_meal_type: 'lunch',
      p_cheat_meal: true,
    })
    await alice.client.rpc('set_meal_note', {
      p_user_id: alice.id,
      p_date: day,
      p_meal_type: 'lunch',
      p_note: 'Fine',
    })
    await alice.client.from('cheat_days').insert({ user_id: alice.id, date: day })
    await alice.client.from('gym_days').insert({ user_id: alice.id, date: day })
    await alice.client.from('day_notes').insert({ user_id: alice.id, date: day, note: 'Mine' })
    await alice.client.from('day_notes').update({ note: 'Mine 2' }).eq('date', day)
    await alice.client.from('cheat_days').delete().eq('date', day)
    await alice.client.from('meals').delete().eq('user_id', alice.id).eq('date', day)

    expect(await changesFor(alice, day)).toEqual([])
    expect(await changesFor(bob, day)).toEqual([])
  })

  test('writes by the service role note nothing', async () => {
    const day = '2026-10-13'

    await admin.from('cheat_days').insert({ user_id: alice.id, date: day })
    await admin.from('gym_days').insert({ user_id: alice.id, date: day })
    await admin.from('day_notes').insert({ user_id: alice.id, date: day, note: 'Script' })
    await admin.from('meals').insert({ user_id: alice.id, date: day, meal_type: 'lunch' })
    await admin
      .from('meals')
      .update({ cheat_meal: true, note: 'Script' })
      .eq('user_id', alice.id)
      .eq('date', day)
    await admin.from('meals').delete().eq('user_id', alice.id).eq('date', day)

    expect(await changesFor(alice, day)).toEqual([])
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
