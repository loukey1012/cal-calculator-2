import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useToday } from './useToday'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 1, 23, 59, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToday', () => {
  test('is the local calendar day', () => {
    const { result } = renderHook(() => useToday())

    expect(result.current).toBe('2026-10-01')
  })

  test('moves on at midnight while the app stays open', () => {
    const { result } = renderHook(() => useToday())

    act(() => vi.advanceTimersByTime(61_000))

    expect(result.current).toBe('2026-10-02')
  })

  test('catches up when the app returns to the foreground on a later day', () => {
    const { result } = renderHook(() => useToday())
    // a suspended PWA doesn't fire timers; the clock just jumps
    vi.setSystemTime(new Date(2026, 9, 3, 8, 0, 0))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current).toBe('2026-10-03')
  })
})
