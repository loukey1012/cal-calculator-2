import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser

const DAY = '2026-10-04'

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  const household = await alice.client.rpc('create_household', { p_name: 'Notes' })
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

function setMealNote(user: TestUser, note: string) {
  return user.client.rpc('set_meal_note', {
    p_user_id: alice.id,
    p_date: DAY,
    p_meal_type: 'dinner',
    p_note: note,
  })
}

async function mealsOfDay() {
  const { data } = await alice.client
    .from('meals')
    .select('meal_type, note')
    .eq('user_id', alice.id)
    .eq('date', DAY)
  return data
}

describe('meal notes', () => {
  test('a note on an empty meal creates the meal, trimmed', async () => {
    const { error } = await setMealNote(alice, '  Pizza with colleagues ')

    expect(error).toBeNull()
    expect(await mealsOfDay()).toEqual([{ meal_type: 'dinner', note: 'Pizza with colleagues' }])
  })

  test('the partner can change it; an empty note removes it and keeps the meal', async () => {
    await setMealNote(bob, 'Pizza, guessed')
    expect(await mealsOfDay()).toEqual([{ meal_type: 'dinner', note: 'Pizza, guessed' }])

    const { error } = await setMealNote(bob, '   ')

    expect(error).toBeNull()
    expect(await mealsOfDay()).toEqual([{ meal_type: 'dinner', note: null }])
  })

  test('removing the note of a meal that does not exist creates nothing', async () => {
    await alice.client.rpc('set_meal_note', {
      p_user_id: alice.id,
      p_date: DAY,
      p_meal_type: 'lunch',
      p_note: '',
    })

    expect((await mealsOfDay())?.map((meal) => meal.meal_type)).toEqual(['dinner'])
  })

  test('a note is at most 500 characters', async () => {
    const { error } = await setMealNote(alice, 'x'.repeat(501))

    expect(error?.code).toBe('23514')
  })

  test('outsiders cannot set a note', async () => {
    const { error } = await setMealNote(carol, 'Intruder')

    expect(error).not.toBeNull()
  })
})

describe('day notes', () => {
  test('a day gets a note that the partner reads and changes', async () => {
    const created = await alice.client
      .from('day_notes')
      .upsert({ user_id: alice.id, date: DAY, note: 'Birthday at Oma’s' })
    const changed = await bob.client
      .from('day_notes')
      .upsert({ user_id: alice.id, date: DAY, note: 'Birthday at Oma’s, cake' })
    const { data } = await bob.client
      .from('day_notes')
      .select('note')
      .eq('user_id', alice.id)
      .eq('date', DAY)

    expect(created.error).toBeNull()
    expect(changed.error).toBeNull()
    expect(data).toEqual([{ note: 'Birthday at Oma’s, cake' }])
  })

  test('an empty note is refused (it is deleted instead)', async () => {
    const { error } = await alice.client
      .from('day_notes')
      .upsert({ user_id: alice.id, date: DAY, note: ' ' })

    expect(error?.code).toBe('23514')
  })

  test('outsiders can neither read nor write day notes', async () => {
    const { data } = await carol.client.from('day_notes').select('note').eq('user_id', alice.id)
    const { error } = await carol.client
      .from('day_notes')
      .insert({ user_id: alice.id, date: '2026-10-05', note: 'Intruder' })

    expect(data).toEqual([])
    expect(error?.code).toBe('42501')
  })
})
