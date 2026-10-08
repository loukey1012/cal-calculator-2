import { registerSW } from 'virtual:pwa-register'
import { updateReady } from './updateReady'

/**
 * Registers the offline service worker. A newer version found later waits instead of taking over
 * mid-use: it is offered as "New version ready" and otherwise starts with the next app start.
 * iOS only looks for one when the app starts, so look again whenever it returns to the front.
 */
export function registerServiceWorker(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => updateReady.markReady(() => void updateSW(true)),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {})
      })
    },
  })
}
