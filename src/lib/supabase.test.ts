import { afterEach, describe, expect, test, vi } from 'vitest'

const createClientMock = vi.hoisted(() => vi.fn(() => ({ mocked: true })))
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    createClientMock.mockClear()
  })

  test('is created from the validated env with persistent sessions', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdefgh.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

    const { supabase } = await import('./supabase')

    expect(supabase).toEqual({ mocked: true })
    expect(createClientMock).toHaveBeenCalledWith('https://abcdefgh.supabase.co', 'test-anon-key', {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  })

  test('fails fast when env is invalid', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')

    await expect(import('./supabase')).rejects.toThrow(/VITE_SUPABASE_URL/)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
