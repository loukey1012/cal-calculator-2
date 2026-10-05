import { onlineManager } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { renderWithProviders } from '../test/render'
import { SyncStatus } from './SyncStatus'

function pendingDayChange(queryClient: import('@tanstack/react-query').QueryClient) {
  void queryClient
    .getMutationCache()
    .build(queryClient, {
      mutationKey: ['day', 'u1', '2026-10-01'],
      mutationFn: () => new Promise(() => {}),
    })
    .execute(undefined)
}

afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe('SyncStatus', () => {
  test('shows nothing when online with nothing to save', () => {
    renderWithProviders(<SyncStatus />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('says when the phone is offline', () => {
    act(() => onlineManager.setOnline(false))
    renderWithProviders(<SyncStatus />)

    expect(screen.getByRole('status')).toHaveTextContent('Offline')
  })

  test('counts changes waiting while offline', async () => {
    act(() => onlineManager.setOnline(false))
    const { queryClient } = renderWithProviders(<SyncStatus />)

    act(() => {
      pendingDayChange(queryClient)
      pendingDayChange(queryClient)
    })

    expect(await screen.findByText('Offline · 2 changes pending')).toBeInTheDocument()
  })

  test('counts queued dish changes like meal changes', async () => {
    act(() => onlineManager.setOnline(false))
    const { queryClient } = renderWithProviders(<SyncStatus />)

    act(() => {
      pendingDayChange(queryClient)
      void queryClient
        .getMutationCache()
        .build(queryClient, { mutationKey: ['dish'], mutationFn: () => new Promise(() => {}) })
        .execute(undefined)
    })

    expect(await screen.findByText('Offline · 2 changes pending')).toBeInTheDocument()
  })

  test('shows that changes are being saved once back online', async () => {
    const { queryClient } = renderWithProviders(<SyncStatus />)

    act(() => pendingDayChange(queryClient))

    expect(await screen.findByText('Saving 1 change…')).toBeInTheDocument()
  })
})
