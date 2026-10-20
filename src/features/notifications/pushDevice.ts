import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { keyBytes } from './pushSupport'

/** Public by design (it only proves pushes come from this app); the private key is a secret. */
export const VAPID_PUBLIC_KEY =
  'BKHxxQ-c9HKxfYv1KmsnHOA10zUG9suN0fwkcDzsiV-sSHqY0bH3Mgcgv3m5Kiku-HRG4YUQ6y2h7dy0u3TXvII'

/** on: this phone gets them; blocked: turned off in the phone's settings for the app */
export type DeviceState = 'on' | 'off' | 'blocked'

export type TestResult = {
  readonly sent: number
  readonly removed: number
  readonly failed: number
}

export class PermissionRefusedError extends Error {
  constructor() {
    super('Notifications weren’t allowed.')
    this.name = 'PermissionRefusedError'
  }
}

/** null while no service worker runs (e.g. the dev server): there is nothing to push to then. */
async function pushManager(): Promise<PushManager | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration?.pushManager ?? null
}

export async function deviceState(): Promise<DeviceState> {
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  const subscription = await (await pushManager())?.getSubscription()
  return subscription ? 'on' : 'off'
}

function deviceLabel(): string {
  const agent = navigator.userAgent
  if (agent.includes('iPhone')) return 'iPhone'
  if (agent.includes('iPad') || (agent.includes('Macintosh') && navigator.maxTouchPoints > 1)) {
    return 'iPad'
  }
  return 'Browser'
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('The phone gave no push address.')
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_device_label: deviceLabel(),
  })
  if (error) throw ApiError.from(error)
}

/** Asks for permission (call it straight from a tap: iOS requires that), then subscribes. */
export async function turnOn(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PermissionRefusedError()
  const manager = (await navigator.serviceWorker.ready).pushManager
  const subscription =
    (await manager.getSubscription()) ??
    (await manager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }))
  await saveSubscription(subscription)
}

/** Keeps the server's copy in step, e.g. after someone else signed in on this phone. */
export async function refreshSubscription(): Promise<void> {
  const subscription = await (await pushManager())?.getSubscription()
  if (subscription) await saveSubscription(subscription)
}

export async function turnOff(): Promise<void> {
  const subscription = await (await pushManager())?.getSubscription()
  if (!subscription) return
  const { error } = await supabase.rpc('delete_push_subscription', {
    p_endpoint: subscription.endpoint,
  })
  if (error) throw ApiError.from(error)
  await subscription.unsubscribe()
}

/** Pushes a test notification to every phone of mine that has notifications on. */
export async function sendTest(): Promise<TestResult> {
  const { data, error } = await supabase.functions.invoke<TestResult>('push-test', {
    method: 'POST',
  })
  if (error) throw error instanceof Error ? error : new Error(String(error))
  if (!data) throw new Error('No answer from the notification service.')
  return data
}
