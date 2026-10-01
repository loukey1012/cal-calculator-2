import { describe, expect, test } from 'vitest'
import { parseEnv } from './env'

const VALID = {
  VITE_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.test.key',
}

describe('parseEnv', () => {
  test('returns typed config when all variables are valid', () => {
    const env = parseEnv(VALID)

    expect(env).toEqual({
      supabaseUrl: VALID.VITE_SUPABASE_URL,
      supabaseAnonKey: VALID.VITE_SUPABASE_ANON_KEY,
    })
  })

  test('throws a readable error naming the missing variable', () => {
    const { VITE_SUPABASE_URL: _omit, ...rest } = VALID

    expect(() => parseEnv(rest)).toThrow(/VITE_SUPABASE_URL/)
  })

  test('rejects a supabase url that is not a url', () => {
    expect(() => parseEnv({ ...VALID, VITE_SUPABASE_URL: 'not-a-url' })).toThrow(
      /VITE_SUPABASE_URL/,
    )
  })

  test('rejects an empty anon key', () => {
    expect(() => parseEnv({ ...VALID, VITE_SUPABASE_ANON_KEY: '' })).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    )
  })
})
