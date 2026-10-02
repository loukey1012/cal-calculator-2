import { onlineManager } from '@tanstack/react-query'

/**
 * TanStack Query assumes "online" at startup and only reacts to later online/offline events.
 * An app opened without a connection would then try to send queued changes right away, so the
 * starting state comes from the browser; events keep it current afterwards.
 */
export function startOnlineTracking(): void {
  onlineManager.setOnline(navigator.onLine)
}
