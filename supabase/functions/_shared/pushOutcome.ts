/**
 * What a push service's answer means for the subscription (shared by the push functions; plain
 * TypeScript, so the app's tests cover it too).
 */
export type PushOutcome = 'sent' | 'gone' | 'failed'

// 404 / 410: the phone unsubscribed or the subscription expired; it never comes back
const GONE_STATUSES: ReadonlySet<number> = new Set([404, 410])

export function pushOutcome(statusCode: number | undefined): PushOutcome {
  if (statusCode !== undefined && statusCode >= 200 && statusCode < 300) return 'sent'
  if (statusCode !== undefined && GONE_STATUSES.has(statusCode)) return 'gone'
  return 'failed'
}

export type PushTally = { readonly sent: number; readonly removed: number; readonly failed: number }

export function tally(outcomes: readonly PushOutcome[]): PushTally {
  return {
    sent: outcomes.filter((outcome) => outcome === 'sent').length,
    removed: outcomes.filter((outcome) => outcome === 'gone').length,
    failed: outcomes.filter((outcome) => outcome === 'failed').length,
  }
}
