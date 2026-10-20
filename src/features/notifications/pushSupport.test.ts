import { describe, expect, test } from 'vitest'
import { keyBytes, pushAvailability, type PushEnvironment } from './pushSupport'

const FULL: PushEnvironment = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isStandalone: true,
  isIos: true,
}

describe('pushAvailability', () => {
  test('the app on the Home Screen gets notifications', () => {
    expect(pushAvailability(FULL)).toBe('available')
  })

  test('in a Safari tab on iPhone it has to be added to the Home Screen first', () => {
    expect(pushAvailability({ ...FULL, isStandalone: false, hasPushManager: false })).toBe(
      'installFirst',
    )
  })

  test('an iPhone without push (before iOS 16.4) is unsupported', () => {
    expect(pushAvailability({ ...FULL, hasPushManager: false })).toBe('unsupported')
  })

  test('a desktop browser tab is fine', () => {
    expect(pushAvailability({ ...FULL, isIos: false, isStandalone: false })).toBe('available')
  })
})

describe('keyBytes', () => {
  test('decodes base64url without padding', () => {
    expect([...keyBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239])
  })
})
