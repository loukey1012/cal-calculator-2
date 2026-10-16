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
const reviewKey = randomBytes(32).toString('base64url')
const routine = anonClient()

const hashOf = (key: string) => `\\x${createHash('sha256').update(key).digest('hex')}`

async function submit(findings: unknown[], runId = 'run-1') {
  return routine.rpc('submit_ingredient_findings', {
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
    const seen = await bob.client.from('ingredient_findings').select('*')
    expect(seen.data).toHaveLength(1)
    expect(seen.data?.[0]).toMatchObject({
      ingredient_id: butterId,
      kind: 'typo',
      status: 'open',
      run_id: 'run-1',
      suggestion: { name: 'Butter' },
    })
    const other = await carol.client.from('ingredient_findings').select('*')
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
    const wrongKey = await routine.rpc('submit_ingredient_findings', {
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
      .from('ingredient_findings')
      .select('*', { count: 'exact', head: true })
    expect(count).toBe(1)
  })
})

describe('members and findings', () => {
  test('either member decides a finding: applied or ignored, and when', async () => {
    const { data: finding } = await alice.client.from('ingredient_findings').select('id').single()

    const { data, error } = await bob.client
      .from('ingredient_findings')
      .update({ status: 'ignored', decided_by: bob.id, decided_at: new Date().toISOString() })
      .eq('id', finding?.id)
      .select('status, decided_by')
      .single()

    expect(error).toBeNull()
    expect(data).toEqual({ status: 'ignored', decided_by: bob.id })
  })

  test('members can’t write findings themselves or change what one says', async () => {
    const { data: finding } = await alice.client.from('ingredient_findings').select('id').single()

    const inserted = await alice.client.from('ingredient_findings').insert({
      household_id: householdId,
      ingredient_id: butterId,
      kind: 'other',
      message: 'Made up',
      run_id: 'mine',
    })
    const reworded = await alice.client
      .from('ingredient_findings')
      .update({ message: 'Something else' })
      .eq('id', finding?.id)
    const deleted = await alice.client
      .from('ingredient_findings')
      .delete()
      .eq('id', finding?.id)
      .select('id')

    expect(inserted.error).not.toBeNull()
    expect(reworded.error).not.toBeNull()
    expect(deleted.data ?? []).toEqual([])
  })

  test('another household can’t decide our findings', async () => {
    const { data: finding } = await alice.client.from('ingredient_findings').select('id').single()

    const { data } = await carol.client
      .from('ingredient_findings')
      .update({ status: 'applied' })
      .eq('id', finding?.id)
      .select('id')

    expect(data).toEqual([])
  })
})
