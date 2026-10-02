import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@tanstack/react-query-persist-client', () => ({ persistQueryClientSave: vi.fn() }))

import { persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { useResumeOfflineChanges, useSaveWhenHidden } from './offlineLifecycle'

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('useSaveWhenHidden', () => {
  test('saves to the phone right away when the app goes to the background', () => {
    const queryClient = new QueryClient()
    renderHook(() => useSaveWhenHidden(), { wrapper: wrapperFor(queryClient) })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pagehide'))

    expect(persistQueryClientSave).toHaveBeenCalledTimes(2)
    expect(persistQueryClientSave).toHaveBeenCalledWith(expect.objectContaining({ queryClient }))
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
