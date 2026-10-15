import { describe, expect, test } from 'vitest'
import { anonClient } from './helpers'

describe('keep_alive', () => {
  test('anyone can call it, and it answers with nothing but true', async () => {
    const { data, error } = await anonClient().rpc('keep_alive')

    expect(error).toBeNull()
    expect(data).toBe(true)
  })
})
