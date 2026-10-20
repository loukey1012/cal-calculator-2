import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn(), functions: { invoke: vi.fn() } },
}))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { deviceState, PermissionRefusedError, sendTest, turnOff, turnOn } from './pushDevice'

const SUBSCRIPTION_JSON = {
  endpoint: 'https://web.push.apple.com/abc',
  keys: { p256dh: 'BPhoneKey', auth: 'secret' },
}

function fakeSubscription() {
  return {
    endpoint: SUBSCRIPTION_JSON.endpoint,
    toJSON: () => SUBSCRIPTION_JSON,
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

function fakePhone(permission: NotificationPermission, subscribed: boolean) {
  const subscription = fakeSubscription()
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(subscribed ? subscription : null),
    subscribe: vi.fn().mockResolvedValue(subscription),
  }
  const registration = { pushManager }
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  })
  return { pushManager, subscription }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabaseMock.rpc.mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('deviceState', () => {
  test.each([
    ['granted', true, 'on'],
    ['granted', false, 'off'],
    ['default', false, 'off'],
    ['denied', false, 'blocked'],
  ] as const)('%s permission, subscribed %s → %s', async (permission, subscribed, state) => {
    fakePhone(permission, subscribed)

    expect(await deviceState()).toBe(state)
  })
})

describe('turnOn', () => {
  test('subscribes with the app key and saves the phone for me', async () => {
    // Arrange
    const { pushManager } = fakePhone('granted', false)

    // Act
    await turnOn()

    // Assert
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    })
    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_push_subscription', {
      p_endpoint: SUBSCRIPTION_JSON.endpoint,
      p_p256dh: 'BPhoneKey',
      p_auth: 'secret',
      p_device_label: expect.any(String),
    })
  })

  test('a refused permission subscribes nothing', async () => {
    const { pushManager } = fakePhone('denied', false)

    await expect(turnOn()).rejects.toBeInstanceOf(PermissionRefusedError)
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })
})

describe('turnOff', () => {
  test('forgets the phone on the server, then unsubscribes', async () => {
    const { subscription } = fakePhone('granted', true)

    await turnOff()

    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_push_subscription', {
      p_endpoint: SUBSCRIPTION_JSON.endpoint,
    })
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  test('keeps the subscription when the server can’t be reached', async () => {
    const { subscription } = fakePhone('granted', true)
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })

    await expect(turnOff()).rejects.toThrow()
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })
})

describe('sendTest', () => {
  test('returns how many phones got it', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { sent: 1, removed: 0, failed: 0 },
      error: null,
    })

    expect(await sendTest()).toEqual({ sent: 1, removed: 0, failed: 0 })
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('push-test', { method: 'POST' })
  })
})
