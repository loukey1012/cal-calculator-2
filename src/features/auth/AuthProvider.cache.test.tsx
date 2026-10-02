import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./authApi', () => ({ getSession: vi.fn(), onSessionChange: vi.fn() }))
vi.mock('../../lib/persistence', () => ({
  clearPersistedCache: vi.fn().mockResolvedValue(undefined),
}))

import { clearPersistedCache } from '../../lib/persistence'
import { getSession, onSessionChange } from './authApi'
import { AuthProvider } from './AuthProvider'

const session = (id: string) => ({ user: { id } }) as never

function renderProvider() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['day', 'u1', '2026-10-01'], [{ id: 'cached' }])
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <p>app</p>
      </AuthProvider>
    </QueryClientProvider>,
  )
  const listener = vi.mocked(onSessionChange).mock.calls[0]?.[0]
  return { queryClient, emit: (value: unknown) => act(() => listener?.(value as never)) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(onSessionChange).mockReturnValue(() => {})
})

describe('AuthProvider cache hygiene', () => {
  test('an unexpected sign-out (e.g. expired session) removes the account’s data from the phone', async () => {
    vi.mocked(getSession).mockResolvedValue(session('u1'))
    const { queryClient, emit } = renderProvider()
    await vi.waitFor(() => expect(getSession).toHaveBeenCalled())

    emit(null)

    expect(queryClient.getQueryData(['day', 'u1', '2026-10-01'])).toBeUndefined()
    expect(clearPersistedCache).toHaveBeenCalled()
  })

  test('starting signed out discards whatever was cached on the phone', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const { queryClient } = renderProvider()

    await vi.waitFor(() => expect(clearPersistedCache).toHaveBeenCalled())
    expect(queryClient.getQueryData(['day', 'u1', '2026-10-01'])).toBeUndefined()
  })

  test('another account signing in never sees the previous account’s cache', async () => {
    vi.mocked(getSession).mockResolvedValue(session('u1'))
    const { queryClient, emit } = renderProvider()
    await vi.waitFor(() => expect(getSession).toHaveBeenCalled())

    emit(session('u2'))

    expect(queryClient.getQueryData(['day', 'u1', '2026-10-01'])).toBeUndefined()
    expect(clearPersistedCache).toHaveBeenCalled()
  })

  test('a token refresh for the same account keeps the cache', async () => {
    vi.mocked(getSession).mockResolvedValue(session('u1'))
    const { queryClient, emit } = renderProvider()
    await vi.waitFor(() => expect(getSession).toHaveBeenCalled())

    emit(session('u1'))

    expect(queryClient.getQueryData(['day', 'u1', '2026-10-01'])).toEqual([{ id: 'cached' }])
    expect(clearPersistedCache).not.toHaveBeenCalled()
  })
})
