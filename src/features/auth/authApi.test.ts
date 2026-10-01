import { beforeEach, describe, expect, test, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))
vi.mock('../../lib/supabase', () => ({ supabase: { auth } }))

import { getSession, onSessionChange, signIn, signOut, signUp } from './authApi'

beforeEach(() => vi.clearAllMocks())

describe('authApi', () => {
  test('signIn passes credentials and throws on error', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
    await signIn({ email: 'me@example.com', password: 'pw' })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'pw',
    })

    auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new Error('Invalid login credentials'),
    })
    await expect(signIn({ email: 'me@example.com', password: 'bad' })).rejects.toThrow(
      'Invalid login credentials',
    )
  })

  test('signUp stores the display name and reports whether email confirmation is needed', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: null, user: {} }, error: null })

    const result = await signUp({
      displayName: 'Lukas',
      email: 'me@example.com',
      password: 'longenough',
    })

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'longenough',
      options: { data: { display_name: 'Lukas' } },
    })
    expect(result).toEqual({ needsEmailConfirmation: true })
  })

  test('signUp with an immediate session needs no confirmation; errors are thrown', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: { user: {} } }, error: null })
    await expect(
      signUp({ displayName: 'A', email: 'a@example.com', password: 'longenough' }),
    ).resolves.toEqual({ needsEmailConfirmation: false })

    auth.signUp.mockResolvedValueOnce({ data: {}, error: new Error('User already registered') })
    await expect(
      signUp({ displayName: 'A', email: 'a@example.com', password: 'longenough' }),
    ).rejects.toThrow('User already registered')
  })

  test('signOut throws on error', async () => {
    auth.signOut.mockResolvedValueOnce({ error: null })
    await expect(signOut()).resolves.toBeUndefined()

    auth.signOut.mockResolvedValueOnce({ error: new Error('Load failed') })
    await expect(signOut()).rejects.toThrow('Load failed')
  })

  test('getSession returns the stored session or throws', async () => {
    const session = { user: { id: 'u1' } }
    auth.getSession.mockResolvedValueOnce({ data: { session }, error: null })
    await expect(getSession()).resolves.toBe(session)

    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('x') })
    await expect(getSession()).rejects.toThrow('x')
  })

  test('onSessionChange forwards sessions and returns an unsubscribe function', () => {
    const unsubscribe = vi.fn()
    auth.onAuthStateChange.mockReturnValueOnce({ data: { subscription: { unsubscribe } } })
    const listener = vi.fn()

    const stop = onSessionChange(listener)
    const callback = auth.onAuthStateChange.mock.calls[0]?.[0]
    callback('SIGNED_IN', { user: { id: 'u1' } })
    stop()

    expect(listener).toHaveBeenCalledWith({ user: { id: 'u1' } })
    expect(unsubscribe).toHaveBeenCalled()
  })
})
