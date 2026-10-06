import type { QueryKey } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { BATCH_DELAY_MS, createRefreshBatcher } from './refreshBatcher'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(options: { pending?: () => boolean } = {}) {
  const refreshed: QueryKey[][] = []
  const batcher = createRefreshBatcher({
    refresh: (keys) => refreshed.push([...keys]),
    hasPendingChanges: options.pending ?? (() => false),
  })
  return { batcher, refreshed }
}

describe('createRefreshBatcher', () => {
  test('a burst of hints becomes one refresh, each key once', () => {
    // Arrange
    const { batcher, refreshed } = setup()

    // Act: a dish save sends several hints at once
    batcher.add([
      ['day', 'p', '2026-10-06'],
      ['month', 'p'],
    ])
    batcher.add([['day', 'p', '2026-10-06']])
    batcher.add([['dish', 'd1'], ['leftovers']])
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    // Assert
    expect(refreshed).toEqual([
      [['day', 'p', '2026-10-06'], ['month', 'p'], ['dish', 'd1'], ['leftovers']],
    ])
  })

  test('nothing is refreshed before the burst is over', () => {
    const { batcher, refreshed } = setup()

    batcher.add([['leftovers']])
    vi.advanceTimersByTime(BATCH_DELAY_MS - 1)

    expect(refreshed).toEqual([])
  })

  test('no keys, no refresh', () => {
    const { batcher, refreshed } = setup()

    batcher.add([])
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    expect(refreshed).toEqual([])
  })

  test('waits while my own changes are still being saved, then refreshes', () => {
    // Arrange: one of my changes is on its way
    let pending = true
    const { batcher, refreshed } = setup({ pending: () => pending })

    // Act
    batcher.add([['leftovers']])
    vi.advanceTimersByTime(BATCH_DELAY_MS * 3)

    // Assert: a refresh now could briefly undo my unsaved change on screen
    expect(refreshed).toEqual([])

    pending = false
    vi.advanceTimersByTime(BATCH_DELAY_MS)
    expect(refreshed).toEqual([[['leftovers']]])
  })

  test('stop drops what was waiting', () => {
    const { batcher, refreshed } = setup()

    batcher.add([['leftovers']])
    batcher.stop()
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    expect(refreshed).toEqual([])
  })
})
