import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { PERSIST_KEY } from '../lib/persistence'
import { useResumeOfflineChanges, useSaveWhenHidden } from './offlineLifecycle'

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

function storedDay(): unknown {
  const stored = JSON.parse(localStorage.getItem(PERSIST_KEY) ?? '{}')
  return stored.clientState?.queries?.find(
    (query: { queryKey: unknown[] }) => query.queryKey[0] === 'day',
  )?.state.data
}

describe('useSaveWhenHidden', () => {
  test.each(['visibilitychange', 'pagehide'])(
    'writes the cache to the phone at once on %s, not after the usual delay',
    (event) => {
      // Arrange: a change made a moment ago
      const queryClient = new QueryClient()
      queryClient.setQueryData(['day', 'u1', '2026-10-06'], [{ id: 'm1' }])
      renderHook(() => useSaveWhenHidden(), { wrapper: wrapperFor(queryClient) })
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

      // Act
      const target = event === 'pagehide' ? window : document
      target.dispatchEvent(new Event(event))

      // Assert: stored synchronously, before iOS can end the app
      expect(storedDay()).toEqual([{ id: 'm1' }])
    },
  )

  test('nothing is written while the app stays visible', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['day', 'u1', '2026-10-06'], [{ id: 'm1' }])
    renderHook(() => useSaveWhenHidden(), { wrapper: wrapperFor(queryClient) })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')

    document.dispatchEvent(new Event('visibilitychange'))

    expect(localStorage.getItem(PERSIST_KEY)).toBeNull()
  })

  test('full or blocked storage does not break hiding the app', () => {
    const queryClient = new QueryClient()
    renderHook(() => useSaveWhenHidden(), { wrapper: wrapperFor(queryClient) })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow()
  })
})

describe('useResumeOfflineChanges', () => {
  test('sends changes queued in an earlier session once, when a signed-in app is ready', () => {
    const queryClient = new QueryClient()
    const resume = vi.spyOn(queryClient, 'resumePausedMutations').mockResolvedValue(undefined)
    const { rerender } = renderHook(() => useResumeOfflineChanges(), {
      wrapper: wrapperFor(queryClient),
    })

    rerender()

    expect(resume).toHaveBeenCalledTimes(1)
  })
})
