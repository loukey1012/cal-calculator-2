import { describe, expect, test, vi } from 'vitest'
import { createUpdateReady } from './updateReady'

describe('the waiting update', () => {
  test('is not ready until the service worker says so, then tells its listeners', () => {
    const update = createUpdateReady()
    const listener = vi.fn()
    update.subscribe(listener)

    expect(update.isReady()).toBe(false)
    update.markReady(vi.fn())

    expect(update.isReady()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  test('applying it hands over to the waiting version', () => {
    const update = createUpdateReady()
    const apply = vi.fn()
    update.markReady(apply)

    update.apply()

    expect(apply).toHaveBeenCalledOnce()
  })

  test('applying before anything is waiting does nothing', () => {
    expect(() => createUpdateReady().apply()).not.toThrow()
  })

  test('a listener can stop listening', () => {
    const update = createUpdateReady()
    const listener = vi.fn()
    const stop = update.subscribe(listener)

    stop()
    update.markReady(vi.fn())

    expect(listener).not.toHaveBeenCalled()
  })
})
