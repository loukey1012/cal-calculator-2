import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household.
let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  const household = await alice.client.rpc('create_household', { p_name: 'Drafts' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob].filter(Boolean))
})

describe('cook drafts', () => {
  test('my waiting dish is noted, and each change moves its time on', async () => {
    // Arrange
    const first = await alice.client
      .from('cook_drafts')
      .upsert({ user_id: alice.id, label: 'Chili', line_count: 2 })
      .select('updated_at')
      .single()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Act
    const second = await alice.client
      .from('cook_drafts')
      .upsert({ user_id: alice.id, label: 'Chili', line_count: 3 })
      .select('label, line_count, updated_at')
      .single()

    // Assert
    expect(first.error).toBeNull()
    expect(second.data).toMatchObject({ label: 'Chili', line_count: 3 })
    expect(Date.parse(second.data?.updated_at ?? '')).toBeGreaterThan(
      Date.parse(first.data?.updated_at ?? ''),
    )
  })

  test('the partner neither sees nor changes it', async () => {
    const seen = await bob.client.from('cook_drafts').select('user_id').eq('user_id', alice.id)
    const written = await bob.client
      .from('cook_drafts')
      .upsert({ user_id: alice.id, label: 'Sneaky', line_count: 1 })
    await bob.client.from('cook_drafts').delete().eq('user_id', alice.id)

    expect(seen.data).toEqual([])
    expect(written.error).not.toBeNull()
    const { data } = await admin.from('cook_drafts').select('label').eq('user_id', alice.id)
    expect(data).toEqual([{ label: 'Chili' }])
  })

  test('saving or discarding the dish removes it', async () => {
    const { error } = await alice.client.from('cook_drafts').delete().eq('user_id', alice.id)

    expect(error).toBeNull()
    const { data } = await admin.from('cook_drafts').select('label').eq('user_id', alice.id)
    expect(data).toEqual([])
  })
})
