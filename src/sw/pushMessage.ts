/**
 * What a push carries (sent by the `push` Edge Function): shown as a notification, and the page
 * a tap on it opens. Anything unexpected still shows a plain notification, since iOS ends the
 * subscription of an app that receives a push without showing one.
 */
export type PushMessage = {
  readonly title: string
  readonly body: string
  /** an address inside the app, e.g. /today */
  readonly url: string
  /** a newer notification with the same tag replaces the older one */
  readonly tag: string | undefined
}

export const FALLBACK_MESSAGE: PushMessage = {
  title: 'CALculator',
  body: '',
  url: '/',
  tag: undefined,
}

const MAX_TITLE = 120
const MAX_BODY = 400
const MAX_TAG = 80
// only paths of this app, never another site (no zod here: it would triple the service worker)
const APP_PATH = /^\/(?!\/)/

const textOf = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.length <= max ? value : undefined

export function parsePushMessage(data: unknown): PushMessage {
  if (typeof data !== 'object' || data === null) return FALLBACK_MESSAGE
  const fields = data as Record<string, unknown>
  const title = textOf(fields.title, MAX_TITLE)
  if (!title) return FALLBACK_MESSAGE
  const url = textOf(fields.url, MAX_BODY)
  return {
    title,
    body: textOf(fields.body, MAX_BODY) ?? '',
    url: url && APP_PATH.test(url) ? url : '/',
    tag: textOf(fields.tag, MAX_TAG),
  }
}

/** The text of a push as JSON; a push that isn't JSON shows its text as the body. */
export function readPushText(text: string | null): PushMessage {
  if (!text) return FALLBACK_MESSAGE
  try {
    return parsePushMessage(JSON.parse(text))
  } catch {
    return { ...FALLBACK_MESSAGE, body: text.slice(0, MAX_BODY) }
  }
}
