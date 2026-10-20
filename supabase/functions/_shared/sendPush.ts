import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { pushOutcome, tally, type PushOutcome, type PushTally } from './pushOutcome.ts'

/** What a notification shows; read by the app's service worker (src/sw/pushMessage.ts). */
export type PushMessage = {
  readonly title: string
  readonly body?: string
  /** an address inside the app, e.g. /today */
  readonly url?: string
  /** a newer notification with the same tag replaces the older one */
  readonly tag?: string
}

export type Subscription = {
  readonly id: string
  readonly endpoint: string
  readonly p256dh: string
  readonly auth: string
}

// how long a push service keeps a message for a phone that is off
const TIME_TO_LIVE_S = 6 * 60 * 60

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

webpush.setVapidDetails(
  requireEnv('VAPID_SUBJECT'),
  requireEnv('VAPID_PUBLIC_KEY'),
  requireEnv('VAPID_PRIVATE_KEY'),
)

async function sendOne(subscription: Subscription, message: PushMessage): Promise<PushOutcome> {
  try {
    const response = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(message),
      { TTL: TIME_TO_LIVE_S, urgency: 'normal' },
    )
    return pushOutcome(response.statusCode)
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    const outcome = pushOutcome(statusCode)
    if (outcome === 'failed') {
      console.error('push failed', subscription.id, statusCode, (error as Error).message)
    }
    return outcome
  }
}

/**
 * Sends the message to every subscription; ones the push service says are gone are deleted,
 * delivered ones remember when. Needs a client with the service role.
 */
export async function sendToAll(
  admin: SupabaseClient,
  subscriptions: readonly Subscription[],
  message: PushMessage,
): Promise<PushTally> {
  const outcomes = await Promise.all(subscriptions.map((sub) => sendOne(sub, message)))
  const idsWith = (wanted: PushOutcome) =>
    subscriptions.filter((_, index) => outcomes[index] === wanted).map((sub) => sub.id)
  const gone = idsWith('gone')
  const sent = idsWith('sent')
  if (gone.length > 0) {
    const { error } = await admin.from('push_subscriptions').delete().in('id', gone)
    if (error) console.error('could not delete gone subscriptions', error.message)
  }
  if (sent.length > 0) {
    const { error } = await admin
      .from('push_subscriptions')
      .update({ last_success_at: new Date().toISOString() })
      .in('id', sent)
    if (error) console.error('could not note delivered pushes', error.message)
  }
  return tally(outcomes)
}
