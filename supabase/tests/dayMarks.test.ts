import type { RealtimeChannel } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { admin, anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let householdId: string
let carolHouseholdId: string
const channels: RealtimeChannel[] = []

const SEX_DAY = '2026-10-20'
const GYM_DAY = '2026-10-21'
const SUBSCRIBE_TIMEOUT_MS = 10_000
const MESSAGE_WAIT_MS = 5_000

type Hint = Record<string, unknown>
type Listener = { readonly status: Promise<string>; readonly hints: Hint[] }

async function listen(user: TestUser, topicHouseholdId: string): Promise<Listener> {
  await user.client.realtime.setAuth()
  const hints: Hint[] = []
  const channel = user.client.channel(`household:${topicHouseholdId}`, {
    config: { private: true },
  })
  channels.push(channel)
  const status = new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve('TIMED_OUT'), SUBSCRIBE_TIMEOUT_MS)
    channel
      .on('broadcast', { event: 'change' }, (message) => hints.push(message.payload as Hint))
      .subscribe((state) => {
        if (state === 'SUBSCRIBED' || state === 'CHANNEL_ERROR') {
          clearTimeout(timer)
          resolve(state)
        }
      })
  })
  return { status, hints }
}

async function waitFor(hints: Hint[], match: (hint: Hint) => boolean): Promise<Hint | undefined> {
  const deadline = Date.now() + MESSAGE_WAIT_MS
  while (Date.now() < deadline) {
    const found = hints.find(match)
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return undefined
}

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  const household = await alice.client.rpc('create_household', { p_name: 'Marks' })
  if (household.error) throw new Error(household.error.message)
  householdId = household.data.id
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Elsewhere' })
  if (other.error) throw new Error(other.error.message)
  carolHouseholdId = other.data.id
})

// a second channel on the same topic from the same client times out while the first is open
afterEach(async () => {
  for (const channel of channels.splice(0)) {
    await channel.unsubscribe()
    for (const user of [alice, bob]) await user.client.removeChannel(channel)
  }
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('sex days', () => {
  test('either member sets one; both read it; one mark per household day', async () => {
    // Act
    const byAlice = await alice.client
      .from('sex_days')
      .upsert({ household_id: householdId, date: SEX_DAY }, { onConflict: 'household_id,date' })
    const byBob = await bob.client
      .from('sex_days')
      .upsert({ household_id: householdId, date: SEX_DAY }, { onConflict: 'household_id,date' })

    // Assert
    expect(byAlice.error).toBeNull()
    expect(byBob.error).toBeNull()
    const aliceSees = await alice.client.from('sex_days').select('date').eq('date', SEX_DAY)
    const bobSees = await bob.client.from('sex_days').select('date').eq('date', SEX_DAY)
    expect(aliceSees.data).toEqual([{ date: SEX_DAY }])
    expect(bobSees.data).toEqual([{ date: SEX_DAY }])
  })

  test('either member can take it back', async () => {
    const { error } = await bob.client
      .from('sex_days')
      .delete()
      .eq('household_id', householdId)
      .eq('date', SEX_DAY)

    expect(error).toBeNull()
    const left = await admin.from('sex_days').select('date').eq('household_id', householdId)
    expect(left.data).toEqual([])
  })

  test("another household can't read it or insert into this household", async () => {
    await alice.client.from('sex_days').insert({ household_id: householdId, date: SEX_DAY })

    const carolSees = await carol.client.from('sex_days').select('date')
    const carolInserts = await carol.client
      .from('sex_days')
      .insert({ household_id: householdId, date: '2026-10-22' })
    const carolDeletes = await carol.client
      .from('sex_days')
      .delete()
      .eq('household_id', householdId)
    const visitorSees = await anonClient().from('sex_days').select('date')

    expect(carolSees.data).toEqual([])
    expect(carolInserts.error?.code).toBe('42501')
    expect(carolDeletes.error).toBeNull()
    expect(visitorSees.data ?? []).toEqual([])
    const still = await admin.from('sex_days').select('date').eq('household_id', householdId)
    expect(still.data).toEqual([{ date: SEX_DAY }])
  })

  test('a household sees only its own marks', async () => {
    const own = await carol.client
      .from('sex_days')
      .insert({ household_id: carolHouseholdId, date: SEX_DAY })

    const aliceSees = await alice.client.from('sex_days').select('household_id')

    expect(own.error).toBeNull()
    expect(aliceSees.data).toEqual([{ household_id: householdId }])
  })
})

describe('gym days', () => {
  test('the partner sets my gym day; we both read it', async () => {
    const { error } = await bob.client
      .from('gym_days')
      .upsert({ user_id: alice.id, date: GYM_DAY }, { onConflict: 'user_id,date' })

    expect(error).toBeNull()
    const aliceSees = await alice.client.from('gym_days').select('user_id, date')
    expect(aliceSees.data).toEqual([{ user_id: alice.id, date: GYM_DAY }])
  })

  test('marking it again is no error; the partner can take it back', async () => {
    const again = await alice.client
      .from('gym_days')
      .upsert({ user_id: alice.id, date: GYM_DAY }, { onConflict: 'user_id,date' })
    const removed = await bob.client
      .from('gym_days')
      .delete()
      .eq('user_id', alice.id)
      .eq('date', GYM_DAY)

    expect(again.error).toBeNull()
    expect(removed.error).toBeNull()
    const left = await admin.from('gym_days').select('date').eq('user_id', alice.id)
    expect(left.data).toEqual([])
  })

  test("a stranger can't see or set it", async () => {
    await alice.client.from('gym_days').insert({ user_id: alice.id, date: GYM_DAY })

    const carolSees = await carol.client.from('gym_days').select('date')
    const carolSets = await carol.client
      .from('gym_days')
      .insert({ user_id: alice.id, date: '2026-10-22' })
    const visitorSees = await anonClient().from('gym_days').select('date')

    expect(carolSees.data).toEqual([])
    expect(carolSets.error?.code).toBe('42501')
    expect(visitorSees.data ?? []).toEqual([])
  })
})

describe('marks never count; sex never notifies', () => {
  test('a gym and a sex mark on a day without meals add no day total', async () => {
    const day = '2026-10-23'

    await alice.client.from('gym_days').insert({ user_id: alice.id, date: day })
    await alice.client.from('sex_days').insert({ household_id: householdId, date: day })

    const totals = await alice.client.from('daily_totals').select('date').eq('date', day)
    expect(totals.data).toEqual([])
  })

  test("the partner's gym day is noted as a flag that was off; sex and my own gym are not", async () => {
    const day = '2026-10-27'

    await bob.client.from('sex_days').insert({ household_id: householdId, date: day })
    await bob.client.from('gym_days').insert({ user_id: alice.id, date: day })
    await bob.client.from('gym_days').insert({ user_id: bob.id, date: day })

    const changes = await admin
      .from('partner_changes')
      .select('user_id, actor_id, kind, subject, before')
      .eq('user_id', alice.id)
      .eq('date', day)
    expect(changes.error).toBeNull()
    expect(changes.data).toEqual([
      { user_id: alice.id, actor_id: bob.id, kind: 'flag', subject: 'gym', before: 'off' },
    ])
  })

  test('a day with meals has the same totals with or without the marks', async () => {
    const day = '2026-10-24'
    const meal = await alice.client.rpc('ensure_meal', {
      p_user_id: alice.id,
      p_date: day,
      p_meal_type: 'dinner',
    })
    await alice.client.from('meal_items').insert({
      meal_id: meal.data,
      name: 'Pasta',
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal: 500,
    })
    const columns = 'meal_count, kcal, cheat_day, alcohol_day'
    const before = await alice.client
      .from('daily_totals')
      .select(columns)
      .eq('user_id', alice.id)
      .eq('date', day)

    await bob.client.from('gym_days').insert({ user_id: alice.id, date: day })
    await bob.client.from('sex_days').insert({ household_id: householdId, date: day })

    const after = await alice.client
      .from('daily_totals')
      .select(columns)
      .eq('user_id', alice.id)
      .eq('date', day)
    expect(after.data).toEqual(before.data)
    expect(after.data).toEqual([{ meal_count: 1, kcal: 500, cheat_day: false, alcohol_day: false }])
  })
})

describe('live updates for marks', () => {
  test("a gym day is announced as that person's day, like a cheat day", async () => {
    const day = '2026-10-25'
    const bobListens = await listen(bob, householdId)
    expect(await bobListens.status).toBe('SUBSCRIBED')

    const { error } = await alice.client.from('gym_days').insert({ user_id: alice.id, date: day })

    expect(error).toBeNull()
    const hint = await waitFor(bobListens.hints, (h) => h.date === day)
    expect(hint).toMatchObject({ table: 'meals', user_id: alice.id, date: day, actor: alice.id })
  })

  test('a sex day is announced to both members with its own hint', async () => {
    const day = '2026-10-26'
    const aliceListens = await listen(alice, householdId)
    const bobListens = await listen(bob, householdId)
    expect(await aliceListens.status).toBe('SUBSCRIBED')
    expect(await bobListens.status).toBe('SUBSCRIBED')

    const { error } = await alice.client
      .from('sex_days')
      .insert({ household_id: householdId, date: day })

    expect(error).toBeNull()
    const forBob = await waitFor(bobListens.hints, (h) => h.table === 'sex_days' && h.date === day)
    const forAlice = await waitFor(
      aliceListens.hints,
      (h) => h.table === 'sex_days' && h.date === day,
    )
    expect(forBob).toMatchObject({ table: 'sex_days', date: day, actor: alice.id })
    expect(forAlice).toMatchObject({ table: 'sex_days', date: day, actor: alice.id })
  })

  test('taking a sex day back is announced too (the old version names the day)', async () => {
    const day = '2026-10-26'
    const bobListens = await listen(bob, householdId)
    expect(await bobListens.status).toBe('SUBSCRIBED')

    const { error } = await bob.client
      .from('sex_days')
      .delete()
      .eq('household_id', householdId)
      .eq('date', day)

    expect(error).toBeNull()
    const hint = await waitFor(bobListens.hints, (h) => h.table === 'sex_days' && h.date === day)
    expect(hint).toMatchObject({ table: 'sex_days', date: day, actor: bob.id })
  })
})
