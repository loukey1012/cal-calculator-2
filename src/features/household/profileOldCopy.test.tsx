import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('./householdApi', () => ({ fetchProfile: vi.fn(), fetchMembers: vi.fn() }))

import { useMembers, useProfile } from './hooks'
import { fetchMembers, fetchProfile } from './householdApi'

// a profile as the version before kcal_burned cached it on the phone
const OLD_PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Me',
  accent_color: '#0060df',
  appearance: {},
  created_at: '',
  updated_at: '',
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['profile', 'u1'], OLD_PROFILE)
  client.setQueryData(['members', 'h1'], [OLD_PROFILE])
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

describe('a profile cached by the previous version', () => {
  afterEach(() => onlineManager.setOnline(true))

  test('opens the app offline from the old copy, with calories burned not set', async () => {
    // Arrange: offline, so nothing can be fetched
    onlineManager.setOnline(false)
    const { wrapper } = setup()

    // Act
    const { result } = renderHook(() => useProfile('u1'), { wrapper })

    // Assert
    expect(result.current.data).toEqual({ ...OLD_PROFILE, kcal_burned: null })
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  test('still fetches the current profile when online', async () => {
    // Arrange
    vi.mocked(fetchProfile).mockResolvedValue({ ...OLD_PROFILE, kcal_burned: 2600 })
    const { wrapper } = setup()

    // Act
    const { result } = renderHook(() => useProfile('u1'), { wrapper })

    // Assert
    await waitFor(() => expect(result.current.data?.kcal_burned).toBe(2600))
  })

  test('the members list falls back to the old copy too', () => {
    // Arrange
    onlineManager.setOnline(false)
    const { wrapper } = setup()

    // Act
    const { result } = renderHook(() => useMembers('h1'), { wrapper })

    // Assert
    expect(result.current.data).toEqual([{ ...OLD_PROFILE, kcal_burned: null }])
    expect(fetchMembers).not.toHaveBeenCalled()
  })
})
