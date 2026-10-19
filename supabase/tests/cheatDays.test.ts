import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one.
let alice: TestUser
let bob: TestUser
let carol: TestUser

const CHEAT_MEAL_DAY = '2026-10-02'
const CHEAT_DAY = '2026-10-03'

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  carol = await createTestUser('carol')
  const household = await alice.client.rpc('create_household', { p_name: 'Cheats' })
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

async function dayOf(user: TestUser, userId: string, date: string) {
  const { data, error } = await user.client
    .from('daily_totals')
    .select('meal_count, kcal, cheat_meal, cheat_day')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw new Error(error.message)
  return data
}

describe('cheat meals', () => {
  test('marks an empty meal as a cheat meal: the day knows, with nothing logged', async () => {
    // Act
    const { error } = await alice.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: CHEAT_MEAL_DAY,
      p_meal_type: 'dinner',
      p_cheat_meal: true,
    })

    // Assert
    expect(error).toBeNull()
    const meal = await alice.client
      .from('meals')
      .select('meal_type, cheat_meal')
      .eq('user_id', alice.id)
      .eq('date', CHEAT_MEAL_DAY)
    expect(meal.data).toEqual([{ meal_type: 'dinner', cheat_meal: true }])
    expect(await dayOf(alice, alice.id, CHEAT_MEAL_DAY)).toEqual([
      { meal_count: 0, kcal: 0, cheat_meal: true, cheat_day: false },
    ])
  })

  test('the partner can take it back; setting it twice changes nothing', async () => {
    const again = await bob.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: CHEAT_MEAL_DAY,
      p_meal_type: 'dinner',
      p_cheat_meal: false,
    })
    const twice = await bob.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: CHEAT_MEAL_DAY,
      p_meal_type: 'dinner',
      p_cheat_meal: false,
    })

    expect(again.error).toBeNull()
    expect(twice.error).toBeNull()
    expect(await dayOf(alice, alice.id, CHEAT_MEAL_DAY)).toEqual([
      expect.objectContaining({ cheat_meal: false }),
    ])
  })

  test('someone from another household or a visitor can’t mark it', async () => {
    const carolTries = await carol.client.rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: CHEAT_MEAL_DAY,
      p_meal_type: 'lunch',
      p_cheat_meal: true,
    })
    const visitorTries = await anonClient().rpc('set_cheat_meal', {
      p_user_id: alice.id,
      p_date: CHEAT_MEAL_DAY,
      p_meal_type: 'lunch',
      p_cheat_meal: true,
    })

    expect(carolTries.error?.code).toBe('42501')
    expect(visitorTries.error).not.toBeNull()
    expect(await dayOf(alice, alice.id, CHEAT_MEAL_DAY)).toEqual([
      expect.objectContaining({ cheat_meal: false }),
    ])
  })
})

describe('cheat days', () => {
  test('the partner marks a day without any meals: the day shows up, flagged', async () => {
    // Act
    const { error } = await bob.client
      .from('cheat_days')
      .upsert({ user_id: alice.id, date: CHEAT_DAY }, { onConflict: 'user_id,date' })

    // Assert
    expect(error).toBeNull()
    expect(await dayOf(alice, alice.id, CHEAT_DAY)).toEqual([
      { meal_count: 0, kcal: null, cheat_meal: false, cheat_day: true },
    ])
  })

  test('marking it again is no error, and outsiders neither see nor set it', async () => {
    const again = await alice.client
      .from('cheat_days')
      .upsert({ user_id: alice.id, date: CHEAT_DAY }, { onConflict: 'user_id,date' })
    const carolSees = await carol.client.from('cheat_days').select('date')
    const carolSets = await carol.client
      .from('cheat_days')
      .insert({ user_id: alice.id, date: '2026-10-04' })
    const visitorSees = await anonClient().from('cheat_days').select('date')

    expect(again.error).toBeNull()
    expect(carolSees.data).toEqual([])
    expect(carolSets.error?.code).toBe('42501')
    expect(visitorSees.data ?? []).toEqual([])
  })

  test('removing it leaves no day behind when nothing was logged', async () => {
    const { error } = await alice.client
      .from('cheat_days')
      .delete()
      .eq('user_id', alice.id)
      .eq('date', CHEAT_DAY)

    expect(error).toBeNull()
    expect(await dayOf(alice, alice.id, CHEAT_DAY)).toEqual([])
  })
})

describe('main meals in the day totals', () => {
  test('tell whether lunch and dinner have food; an empty meal or a breakfast is not enough', async () => {
    const day = '2026-10-05'
    const meal = async (meal_type: string) => {
      const { data, error } = await alice.client.rpc('ensure_meal', {
        p_user_id: alice.id,
        p_date: day,
        p_meal_type: meal_type,
      })
      if (error) throw new Error(error.message)
      return data as string
    }
    const lunch = await meal('lunch')
    await meal('dinner') // empty
    const breakfast = await meal('breakfast')
    const item = (meal_id: string) => ({
      meal_id,
      name: 'Bread',
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal: 200,
    })
    const added = await alice.client.from('meal_items').insert([item(lunch), item(breakfast)])

    const { data } = await alice.client
      .from('daily_totals')
      .select('lunch_logged, dinner_logged')
      .eq('user_id', alice.id)
      .eq('date', day)

    expect(added.error).toBeNull()
    expect(data).toEqual([{ lunch_logged: true, dinner_logged: false }])
  })

  test('a cheat day without meals has neither', async () => {
    await alice.client.from('cheat_days').insert({ user_id: alice.id, date: '2026-10-06' })

    const { data } = await alice.client
      .from('daily_totals')
      .select('lunch_logged, dinner_logged')
      .eq('user_id', alice.id)
      .eq('date', '2026-10-06')

    expect(data).toEqual([{ lunch_logged: false, dinner_logged: false }])
  })
})
