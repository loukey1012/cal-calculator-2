import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { startOnlineTracking } from './online'

afterEach(() => {
  vi.unstubAllGlobals()
  onlineManager.setOnline(true)
})

describe('startOnlineTracking', () => {
  test('an app opened without a connection knows it is offline from the start', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })

    startOnlineTracking()

    expect(onlineManager.isOnline()).toBe(false)
  })

  test('an app opened online starts online', () => {
    onlineManager.setOnline(false)
    vi.stubGlobal('navigator', { ...navigator, onLine: true })

    startOnlineTracking()

    expect(onlineManager.isOnline()).toBe(true)
  })
})
