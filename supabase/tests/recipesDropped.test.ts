import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, createTestUser, deleteTestUsers, type TestUser } from './helpers'

let alice: TestUser

beforeAll(async () => {
  alice = await createTestUser('alice')
})

afterAll(async () => {
  await deleteTestUsers([alice].filter(Boolean))
})

describe('recipes are gone', () => {
  test.each(['recipes', 'recipe_portions', 'recipe_lines', 'recipe_line_amounts'])(
    'the table %s no longer exists',
    async (table) => {
      const { error } = await admin.from(table).select('*').limit(1)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('PGRST205')
    },
  )

  test.each([
    ['save_recipe', { p_recipe: {} }],
    ['delete_recipe', { p_recipe_id: crypto.randomUUID() }],
  ])('the function %s no longer exists', async (name, args) => {
    const { error } = await alice.client.rpc(name, args)

    expect(error).not.toBeNull()
    expect(error?.code).toBe('PGRST202')
  })
})
