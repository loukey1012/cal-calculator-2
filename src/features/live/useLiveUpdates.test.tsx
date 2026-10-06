import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { LiveChannelHandlers } from './liveChannel'
import { BATCH_DELAY_MS } from './refreshBatcher'
import { useLiveUpdates } from './useLiveUpdates'

type FakeChannel = { householdId: string; handlers: LiveChannelHandlers; closed: boolean }
const channels: FakeChannel[] = []
/** how long leaving a channel takes; settled at once unless a test holds it */
let leaving: Promise<void> = Promise.resolve()

vi.mock('./liveChannel', () => ({
  openLiveChannel: (householdId: string, handlers: LiveChannelHandlers) => {
    const channel: FakeChannel = { householdId, handlers, closed: false }
    channels.push(channel)
    return {
      close: () => {
        channel.closed = true
        return leaving
      },
    }
  },
}))

const ME = '00000000-0000-4000-8000-000000000001'
const PARTNER = '00000000-0000-4000-8000-000000000002'
const HOUSEHOLD = '00000000-0000-4000-8000-0000000000aa'
const DAY = '2026-10-06'
const partnerDayHint = { table: 'meals', user_id: PARTNER, date: DAY, actor: PARTNER }

let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  vi.useFakeTimers()
  channels.length = 0
  leaving = Promise.resolve()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** opening waits for the previous channel to have left */
const settle = () => act(() => vi.advanceTimersByTimeAsync(0))

async function setup() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['day', PARTNER, DAY], [])
  queryClient.setQueryData(['goals', ME], [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const view = renderHook(() => useLiveUpdates(HOUSEHOLD), { wrapper })
  await settle()
  const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated
  return { queryClient, view, isStale }
}

async function setVisibility(state: DocumentVisibilityState) {
  visibility = state
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await settle()
}

const current = () => channels.at(-1)!

describe('useLiveUpdates', async () => {
  test("listens on the household's channel while the app is open", async () => {
    // Act
    await setup()

    // Assert
    expect(channels).toHaveLength(1)
    expect(current().householdId).toBe(HOUSEHOLD)
  })

  test("a partner's change marks what it touched out of date, after the burst", async () => {
    // Arrange
    const { isStale } = await setup()
    act(() => current().handlers.onConnected())

    // Act
    act(() => current().handlers.onHint(partnerDayHint))

    // Assert
    expect(isStale(['day', PARTNER, DAY])).toBe(false)
    act(() => vi.advanceTimersByTime(BATCH_DELAY_MS))
    expect(isStale(['day', PARTNER, DAY])).toBe(true)
    expect(isStale(['goals', ME])).toBe(false)
  })

  test('malformed messages are ignored', async () => {
    const { isStale } = await setup()

    act(() => current().handlers.onHint({ table: 'meals', user_id: 'nope' }))
    act(() => vi.advanceTimersByTime(BATCH_DELAY_MS))

    expect(isStale(['day', PARTNER, DAY])).toBe(false)
  })

  test("waits for my own pending change before refreshing a partner's", async () => {
    // Arrange: one of my meal changes is still being sent
    const { queryClient, isStale } = await setup()
    let finishSave = () => {}
    const saved = new Promise<void>((resolve) => (finishSave = resolve))
    void queryClient
      .getMutationCache()
      .build(queryClient, { mutationKey: ['day', ME, DAY], mutationFn: () => saved })
      .execute(undefined)

    // Act
    act(() => current().handlers.onHint(partnerDayHint))
    await act(() => vi.advanceTimersByTimeAsync(BATCH_DELAY_MS * 2))

    // Assert
    expect(isStale(['day', PARTNER, DAY])).toBe(false)
    finishSave()
    await act(() => vi.advanceTimersByTimeAsync(BATCH_DELAY_MS))
    expect(isStale(['day', PARTNER, DAY])).toBe(true)
  })

  test('hiding the app closes the channel, showing it opens a new one', async () => {
    // Arrange
    await setup()
    const first = current()

    // Act
    await setVisibility('hidden')

    // Assert
    expect(first.closed).toBe(true)
    await setVisibility('visible')
    expect(channels).toHaveLength(2)
    expect(current().closed).toBe(false)
  })

  test('after reconnecting, everything is refreshed once to catch up on missed changes', async () => {
    // Arrange: connected, then the app was in the background
    const { isStale } = await setup()
    act(() => current().handlers.onConnected())
    expect(isStale(['goals', ME])).toBe(false)
    await setVisibility('hidden')
    await setVisibility('visible')

    // Act
    act(() => current().handlers.onConnected())
    act(() => vi.advanceTimersByTime(BATCH_DELAY_MS))

    // Assert
    expect(isStale(['goals', ME])).toBe(true)
    expect(isStale(['day', PARTNER, DAY])).toBe(true)
  })

  test('the first connection refreshes nothing: the app just loaded', async () => {
    const { isStale } = await setup()

    act(() => current().handlers.onConnected())
    act(() => vi.advanceTimersByTime(BATCH_DELAY_MS))

    expect(isStale(['goals', ME])).toBe(false)
  })

  test('a quick hide and show opens the new channel only once the old one has left', async () => {
    // Arrange: leaving takes a moment (the same topic can't be joined twice meanwhile)
    await setup()
    let left = () => {}
    leaving = new Promise<void>((resolve) => (left = resolve))

    // Act
    await setVisibility('hidden')
    await setVisibility('visible')

    // Assert
    expect(channels).toHaveLength(1)
    left()
    await settle()
    expect(channels).toHaveLength(2)
    expect(current().closed).toBe(false)
  })

  test('hidden again before the old channel left: no channel is opened', async () => {
    await setup()
    let left = () => {}
    leaving = new Promise<void>((resolve) => (left = resolve))

    await setVisibility('hidden')
    await setVisibility('visible')
    await setVisibility('hidden')
    left()
    await settle()

    expect(channels).toHaveLength(1)
  })

  test('my own changes from another phone are picked up too', async () => {
    const { isStale } = await setup()

    act(() => current().handlers.onHint({ table: 'goal_history', user_id: ME, actor: ME }))
    act(() => vi.advanceTimersByTime(BATCH_DELAY_MS))

    expect(isStale(['goals', ME])).toBe(true)
  })

  test('signing out closes the channel', async () => {
    const { view } = await setup()

    view.unmount()

    expect(current().closed).toBe(true)
  })
})
