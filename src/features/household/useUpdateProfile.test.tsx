import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('./householdApi', () => ({ updateProfile: vi.fn(), fetchProfile: vi.fn() }))

import { useUpdateProfile } from './hooks'
import { updateProfile } from './householdApi'

function wrapper({ children }: { readonly children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useUpdateProfile', () => {
  test('sends quick changes one after another, so an older one never lands last', async () => {
    const pending: Array<() => void> = []
    vi.mocked(updateProfile).mockImplementation(
      () => new Promise<void>((resolve) => pending.push(resolve)),
    )
    const { result } = renderHook(() => useUpdateProfile('u1'), { wrapper })

    act(() => {
      result.current.mutate({ appearance: { symbol: 'bear' } })
      result.current.mutate({ appearance: { symbol: 'bear', color: 'lavender' } })
    })

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1))
    act(() => pending[0]?.())
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2))
    expect(vi.mocked(updateProfile).mock.lastCall?.[1]).toEqual({
      appearance: { symbol: 'bear', color: 'lavender' },
    })
  })
})
