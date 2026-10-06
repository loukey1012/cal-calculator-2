import type { RealtimeChannel } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let householdId: string
/** Bob's one listener: a client keeps a single channel per topic */
let bobListens: Listener
const channels: RealtimeChannel[] = []

const DAY = '2026-10-03'
const SUBSCRIBE_TIMEOUT_MS = 10_000
const MESSAGE_WAIT_MS = 5_000

type Hint = Record<string, unknown>

type Listener = {
  readonly status: Promise<string>
  /** every hint received so far */
  readonly hints: Hint[]
}

/** Listens on a household's channel; resolves `status` once subscribed or refused. */
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
  const household = await alice.client.rpc('create_household', { p_name: 'Live' })
  if (household.error) throw new Error(household.error.message)
  householdId = household.data.id
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Elsewhere' })
  if (other.error) throw new Error(other.error.message)
  bobListens = await listen(bob, householdId)
})

afterAll(async () => {
  for (const channel of channels) await channel.unsubscribe()
  await deleteTestUsers([alice, bob, carol])
})

describe('live updates', () => {
  test('a partner hears which day changed, and who changed it', async () => {
    // Arrange
    expect(await bobListens.status).toBe('SUBSCRIBED')

    // Act
    const { error } = await alice.client
      .from('meals')
      .insert({ user_id: alice.id, date: DAY, meal_type: 'dinner' })

    // Assert
    expect(error).toBeNull()
    const hint = await waitFor(bobListens.hints, (h) => h.table === 'meals')
    expect(hint).toMatchObject({ table: 'meals', user_id: alice.id, date: DAY, actor: alice.id })
  })

  test('a changed ingredient is announced to the household', async () => {
    // Arrange
    expect(await bobListens.status).toBe('SUBSCRIBED')

    // Act
    const { error } = await alice.client
      .from('ingredients')
      .insert({ household_id: householdId, name: 'Live rice', kcal_100: 130 })

    // Assert
    expect(error).toBeNull()
    const hint = await waitFor(bobListens.hints, (h) => h.table === 'ingredients')
    expect(hint).toMatchObject({ table: 'ingredients', actor: alice.id })
  })

  test("someone from another household can't listen in", async () => {
    // Act
    const carolListens = await listen(carol, householdId)

    // Assert
    expect(await carolListens.status).toBe('CHANNEL_ERROR')
  })
})
