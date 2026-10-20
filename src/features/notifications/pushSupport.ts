/**
 * Whether this phone can get push notifications from the app. On iPhone that needs iOS 16.4+
 * and the app opened from the Home Screen (Safari tabs never get them).
 */
export type PushAvailability = 'available' | 'installFirst' | 'unsupported'

export type PushEnvironment = {
  readonly hasServiceWorker: boolean
  readonly hasPushManager: boolean
  readonly hasNotification: boolean
  /** opened from the Home Screen */
  readonly isStandalone: boolean
  readonly isIos: boolean
}

export function pushAvailability(env: PushEnvironment): PushAvailability {
  // iOS hides the push APIs in Safari tabs, so check "installed" first there
  if (env.isIos && !env.isStandalone) return 'installFirst'
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return 'unsupported'
  return 'available'
}

export function browserPushEnvironment(): PushEnvironment {
  const nav = navigator as Navigator & { readonly standalone?: boolean }
  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    isStandalone:
      nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true,
    // iPadOS reports itself as a Mac with touch
    isIos:
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1),
  }
}

/** The VAPID public key (base64url) as the bytes PushManager.subscribe expects. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
