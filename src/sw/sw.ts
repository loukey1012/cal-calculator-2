/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { readPushText } from './pushMessage'

/**
 * The app's service worker: the app works offline (everything precached), a new version waits
 * until it is offered ("New version ready", see registerServiceWorker.ts), and pushes show as
 * notifications that open the right page.
 */
declare const self: ServiceWorkerGlobalScope

const NOTIFICATION_ICON = '/pwa-192x192.png'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// every address of the app is the app page; the search proxy never is
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/off\//] }),
)

// the label reader's ~8 MB stay out of every install: kept once first used
registerRoute(
  ({ url }) => url.pathname.startsWith('/ocr/'),
  new CacheFirst({ cacheName: 'ocr', plugins: [new CacheableResponsePlugin({ statuses: [200] })] }),
)

// "New version ready" › Update
self.addEventListener('message', (event) => {
  if ((event.data as { type?: unknown } | null)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('push', (event) => {
  const message = readPushText(event.data?.text() ?? null)
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: NOTIFICATION_ICON,
      data: { url: message.url },
    }),
  )
})

/** Opens the notification's page: in the open app if there is one, else by starting it. */
async function openPage(path: string): Promise<void> {
  const url = new URL(path, self.location.origin).href
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const open = windows[0]
  if (!open) {
    await self.clients.openWindow(url)
    return
  }
  const focused = await open.focus()
  await focused.navigate(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(openPage(path))
})
