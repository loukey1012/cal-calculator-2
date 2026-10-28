import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { KEY_SHOWN_STORAGE_KEY, useKeyShown } from './useKeyShown'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('useKeyShown', () => {
  test('is hidden until it was shown on purpose', () => {
    const { result } = renderHook(() => useKeyShown())

    expect(result.current[0]).toBe(false)
  })

  test('remembers the choice on the phone', () => {
    const first = renderHook(() => useKeyShown())
    act(() => first.result.current[1](true))
    expect(first.result.current[0]).toBe(true)
    expect(localStorage.getItem(KEY_SHOWN_STORAGE_KEY)).toBe('true')
    first.unmount()

    const second = renderHook(() => useKeyShown())
    expect(second.result.current[0]).toBe(true)
    act(() => second.result.current[1](false))
    expect(localStorage.getItem(KEY_SHOWN_STORAGE_KEY)).toBe('false')
    expect(renderHook(() => useKeyShown()).result.current[0]).toBe(false)
  })

  test('an old stored "false" and anything but "true" read as hidden', () => {
    localStorage.setItem(KEY_SHOWN_STORAGE_KEY, 'yes')

    expect(renderHook(() => useKeyShown()).result.current[0]).toBe(false)
  })

  test('still works when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useKeyShown())

    expect(result.current[0]).toBe(false)
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
  })
})
