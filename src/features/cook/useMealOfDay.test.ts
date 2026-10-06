import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useMealOfDay } from './useMealOfDay'

afterEach(() => vi.useRealTimers())

describe('useMealOfDay', () => {
  test('follows the time of day when the app comes back to the foreground', () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 6, 12, 0))
    const { result } = renderHook(() => useMealOfDay())
    expect(result.current).toBe('lunch')

    // Act
    vi.setSystemTime(new Date(2026, 9, 6, 19, 0))
    act(() => document.dispatchEvent(new Event('visibilitychange')))

    // Assert
    expect(result.current).toBe('dinner')
  })
})
