import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household; Carol is in another one. The review routine only has the
// public anon key and its household's review key.
let alice: TestUser
let bob: TestUser
let carol: TestUser
let householdId: string
let butterId: string
let cheeseId: string
let butterItemId: string
let carolItemId: string
const reviewKey = randomBytes(32).toString('base64url')
const routine = anonClient()

const hashOf = (key: string) => `\\x${createHash('sha256').update(key).digest('hex')}`

async function submit(findings: unknown[], runId = 'run-1') {
  return routine.rpc('submit_review_findings', {
    p_key: reviewKey,
    p_run_id: runId,
    p_findings: findings,
  })
}

beforeAll(async () => {
  alice = await createTestUser('alice-review')
  bob = await createTestUser('bob-review')
  carol = await createTestUser('carol-review')
  const household = await alice.client.rpc('create_household', { p_name: 'Review' })
  if (household.error) throw new Error(household.error.message)
  householdId = household.data.id
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
  const other = await carol.client.rpc('create_household', { p_name: 'Other' })
  if (other.error) throw new Error(other.error.message)

  const butter = await alice.client
    .from('ingredients')
    .insert({ household_id: householdId, name: 'Buter', brand: 'Kerrygold', kcal_100: 740 })
    .select('id')
    .single()
  if (butter.error) throw new Error(butter.error.message)
  butterId = butter.data.id
  const cheese = await carol.client
    .from('ingredients')
    .insert({ household_id: other.data.id, name: 'Cheese', kcal_100: 400 })
    .select('id')
    .single()
  if (cheese.error) throw new Error(cheese.error.message)
  cheeseId = cheese.data.id

  // Alice: breakfast and dinner on the 10th (no lunch), a meal outside the range; Carol: a day
  const breakfast = await alice.client.rpc('ensure_meal', {
    p_user_id: alice.id,
    p_date: '2026-10-10',
    p_meal_type: 'breakfast',
  })
  const dinner = await alice.client.rpc('ensure_meal', {
    p_user_id: alice.id,
    p_date: '2026-10-10',
    p_meal_type: 'dinner',
  })
  const early = await alice.client.rpc('ensure_meal', {
    p_user_id: alice.id,
    p_date: '2026-09-20',
    p_meal_type: 'lunch',
  })
  const carols = await carol.client.rpc('ensure_meal', {
    p_user_id: carol.id,
    p_date: '2026-10-10',
    p_meal_type: 'lunch',
  })
  const item = (meal_id: string, name: string, multiplier: number, kcal: number) => ({
    meal_id,
    name,
    entered_amount: multiplier * 100,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: multiplier,
    kcal,
    protein: 10,
  })
  const items = await alice.client
    .from('meal_items')
    .insert([
      item(breakfast.data, 'Butter', 20, 740),
      item(dinner.data, 'Pasta', 1.5, 350),
      item(early.data, 'Soup', 3, 40),
    ])
    .select('id, name')
  if (items.error) throw new Error(items.error.message)
  butterItemId = items.data.find(({ name }) => name === 'Butter')?.id ?? ''
  const carolsItem = await carol.client
    .from('meal_items')
    .insert(item(carols.data, 'Cake', 1, 400))
    .select('id')
    .single()
  if (carolsItem.error) throw new Error(carolsItem.error.message)
  carolItemId = carolsItem.data.id
  const goal = await alice.client
    .from('goal_history')
    .insert({ user_id: alice.id, valid_from: '2026-10-01', kcal: 2000 })
  if (goal.error) throw new Error(goal.error.message)

  const key = await admin
    .from('review_keys')
    .insert({ household_id: householdId, key_hash: hashOf(reviewKey) })
  if (key.error) throw new Error(key.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob, carol].filter(Boolean))
})

describe('the review routine', () => {
  test('reads its household’s ingredients with the review key, and nothing else', async () => {
    const { data, error } = await routine.rpc('review_ingredients', { p_key: reviewKey })

    expect(error).toBeNull()
    const names = (data.ingredients as Array<{ name: string }>).map(({ name }) => name)
    expect(names).toEqual(['Buter'])
    expect(data.ingredients[0]).toMatchObject({ id: butterId, brand: 'Kerrygold', kcal_100: 740 })
    expect(data).toHaveProperty('categories')
    expect(data.findings).toEqual([])
  })

  test('a wrong key reads nothing', async () => {
    const { data, error } = await routine.rpc('review_ingredients', { p_key: 'not-the-key' })

    expect(data).toBeNull()
    expect(error?.code).toBe('28000')
  })

  test('the keys themselves can’t be read by anyone in the app', async () => {
    const asMember = await alice.client.from('review_keys').select('*')
    const asAnon = await routine.from('review_keys').select('*')

    expect(asMember.data ?? []).toEqual([])
    expect(asAnon.data ?? []).toEqual([])
  })

  test('writes findings for its own ingredients; both members see them, others don’t', async () => {
    const { data: added, error } = await submit([
      {
        ingredient_id: butterId,
        kind: 'typo',
        message: 'The name looks misspelled.',
        suggestion: { name: 'Butter' },
      },
      { ingredient_id: cheeseId, kind: 'typo', message: 'Not ours.', suggestion: {} },
    ])

    expect(error).toBeNull()
    expect(added).toBe(1)
    const seen = await bob.client.from('review_findings').select('*')
    expect(seen.data).toHaveLength(1)
    expect(seen.data?.[0]).toMatchObject({
      ingredient_id: butterId,
      kind: 'typo',
      status: 'open',
      run_id: 'run-1',
      suggestion: { name: 'Butter' },
    })
    const other = await carol.client.from('review_findings').select('*')
    expect(other.data).toEqual([])
  })

  test('never adds the same finding twice, whatever became of the first', async () => {
    const { data: added } = await submit(
      [
        {
          ingredient_id: butterId,
          kind: 'typo',
          message: 'Said again in other words.',
          suggestion: { name: 'Butter' },
        },
      ],
      'run-2',
    )

    expect(added).toBe(0)
  })

  test('reads its earlier findings, so it can skip what was ignored', async () => {
    const { data } = await routine.rpc('review_ingredients', { p_key: reviewKey })

    expect(data.findings).toEqual([
      expect.objectContaining({ ingredient_id: butterId, kind: 'typo', status: 'open' }),
    ])
  })

  test('a wrong key or too many findings at once writes nothing', async () => {
    const wrongKey = await routine.rpc('submit_review_findings', {
      p_key: 'not-the-key',
      p_run_id: 'run-3',
      p_findings: [{ ingredient_id: butterId, kind: 'other', message: 'x', suggestion: {} }],
    })
    const tooMany = await submit(
      Array.from({ length: 101 }, (_, index) => ({
        ingredient_id: butterId,
        kind: 'other',
        message: `Finding ${index}`,
        suggestion: { note: String(index) },
      })),
      'run-3',
    )

    expect(wrongKey.error?.code).toBe('28000')
    expect(tooMany.error).not.toBeNull()
    const { count } = await alice.client
      .from('review_findings')
      .select('*', { count: 'exact', head: true })
    expect(count).toBe(1)
  })
})

describe('the review routine and meals', () => {
  const RANGE = { p_from: '2026-10-04', p_to: '2026-10-10' }

  test('reads both members, their goals and their meals of the given days, with totals', async () => {
    const { data, error } = await routine.rpc('review_meals', { p_key: reviewKey, ...RANGE })

    expect(error).toBeNull()
    expect(data.members).toEqual(
      expect.arrayContaining([
        { id: alice.id, name: 'alice-review' },
        { id: bob.id, name: 'bob-review' },
      ]),
    )
    expect(data.members).toHaveLength(2)
    expect(data.goals).toEqual([
      expect.objectContaining({ user_id: alice.id, valid_from: '2026-10-01', kcal: 2000 }),
    ])
    const meals = data.meals as Array<{
      user_id: string
      date: string
      meal_type: string
      items: Array<{ id: string; name: string; amount: number; unit: string; kcal: number }>
    }>
    // the September lunch and Carol's lunch are left out
    expect(meals.map(({ date, meal_type }) => `${date} ${meal_type}`).sort()).toEqual([
      '2026-10-10 breakfast',
      '2026-10-10 dinner',
    ])
    const butter = meals.find(({ meal_type }) => meal_type === 'breakfast')?.items[0]
    expect(butter).toMatchObject({ id: butterItemId, name: 'Butter', amount: 2000, unit: 'g' })
    // 20 × 740 kcal per 100 g
    expect(butter?.kcal).toBe(14800)
    expect(data.days).toEqual([
      expect.objectContaining({ user_id: alice.id, date: '2026-10-10', kcal: 15325 }),
    ])
  })

  test('a range of more than 31 days or a wrong key reads nothing', async () => {
    const tooLong = await routine.rpc('review_meals', {
      p_key: reviewKey,
      p_from: '2026-08-01',
      p_to: '2026-10-10',
    })
    const wrongKey = await routine.rpc('review_meals', { p_key: 'nope', ...RANGE })

    expect(tooLong.error?.code).toBe('22023')
    expect(wrongKey.error?.code).toBe('28000')
  })

  test('writes a finding about a member’s day, once, and never about another household', async () => {
    const day = {
      user_id: alice.id,
      date: '2026-10-10',
      meal_type: 'lunch',
      kind: 'missing_meal',
      message: 'Breakfast and dinner are logged, but no lunch.',
    }
    const odd = {
      user_id: alice.id,
      date: '2026-10-10',
      meal_type: 'breakfast',
      meal_item_id: butterItemId,
      kind: 'odd_amount',
      message: '2000 g of butter is a lot for one breakfast.',
    }

    const { data: added, error } = await submit(
      [
        day,
        odd,
        { ...day, user_id: carol.id, message: 'Not ours.' },
        { ...odd, meal_item_id: carolItemId, message: 'Not her item.' },
      ],
      'run-meals',
    )
    const again = await submit([day], 'run-meals-2')

    expect(error).toBeNull()
    expect(added).toBe(2)
    expect(again.data).toBe(0)
    const seen = await bob.client
      .from('review_findings')
      .select('kind, user_id, date, meal_type, meal_item_id, ingredient_id')
      .not('user_id', 'is', null)
      .order('kind')
    expect(seen.data).toEqual([
      {
        kind: 'missing_meal',
        user_id: alice.id,
        date: '2026-10-10',
        meal_type: 'lunch',
        meal_item_id: null,
        ingredient_id: null,
      },
      {
        kind: 'odd_amount',
        user_id: alice.id,
        date: '2026-10-10',
        meal_type: 'breakfast',
        meal_item_id: butterItemId,
        ingredient_id: null,
      },
    ])
  })

  test('reads its earlier meal findings with the meals, and only ingredient ones with the ingredients', async () => {
    const meals = await routine.rpc('review_meals', { p_key: reviewKey, ...RANGE })
    const ingredients = await routine.rpc('review_ingredients', { p_key: reviewKey })

    expect((meals.data.findings as Array<{ kind: string }>).map(({ kind }) => kind).sort()).toEqual(
      ['missing_meal', 'odd_amount'],
    )
    expect(
      (ingredients.data.findings as Array<{ kind: string }>).every(({ kind }) => kind === 'typo'),
    ).toBe(true)
  })

  test('deleting the item a finding points at removes that finding, not the meal', async () => {
    const extra = await alice.client
      .from('meal_items')
      .insert({
        meal_id: (
          await alice.client.rpc('ensure_meal', {
            p_user_id: alice.id,
            p_date: '2026-10-09',
            p_meal_type: 'snack',
          })
        ).data,
        name: 'Chips',
        entered_amount: 1,
        entered_unit: 'g',
        basis: 'per_100g',
        basis_multiplier: 0.01,
        kcal: 0,
      })
      .select('id')
      .single()
    await submit(
      [
        {
          user_id: alice.id,
          date: '2026-10-09',
          meal_type: 'snack',
          meal_item_id: extra.data?.id,
          kind: 'zero_kcal',
          message: 'Chips with 0 kcal.',
        },
      ],
      'run-delete',
    )

    const removed = await alice.client.from('meal_items').delete().eq('id', extra.data?.id)
    const { count } = await alice.client
      .from('review_findings')
      .select('*', { count: 'exact', head: true })
      .eq('kind', 'zero_kcal')

    expect(removed.error).toBeNull()
    expect(count).toBe(0)
  })
})

describe('members and findings', () => {
  test('either member decides a finding: applied or ignored, and when', async () => {
    const { data: finding } = await alice.client
      .from('review_findings')
      .select('id')
      .not('ingredient_id', 'is', null)
      .single()

    const { data, error } = await bob.client
      .from('review_findings')
      .update({ status: 'ignored', decided_by: bob.id, decided_at: new Date().toISOString() })
      .eq('id', finding?.id)
      .select('status, decided_by')
      .single()

    expect(error).toBeNull()
    expect(data).toEqual({ status: 'ignored', decided_by: bob.id })
  })

  test('members can’t write findings themselves or change what one says', async () => {
    const { data: finding } = await alice.client
      .from('review_findings')
      .select('id')
      .not('ingredient_id', 'is', null)
      .single()

    const inserted = await alice.client.from('review_findings').insert({
      household_id: householdId,
      ingredient_id: butterId,
      kind: 'other',
      message: 'Made up',
      run_id: 'mine',
    })
    const reworded = await alice.client
      .from('review_findings')
      .update({ message: 'Something else' })
      .eq('id', finding?.id)
    const deleted = await alice.client
      .from('review_findings')
      .delete()
      .eq('id', finding?.id)
      .select('id')

    expect(inserted.error).not.toBeNull()
    expect(reworded.error).not.toBeNull()
    expect(deleted.data ?? []).toEqual([])
  })

  test('another household can’t decide our findings', async () => {
    const { data: finding } = await alice.client
      .from('review_findings')
      .select('id')
      .not('ingredient_id', 'is', null)
      .single()

    const { data } = await carol.client
      .from('review_findings')
      .update({ status: 'applied' })
      .eq('id', finding?.id)
      .select('id')

    expect(data).toEqual([])
  })
})
