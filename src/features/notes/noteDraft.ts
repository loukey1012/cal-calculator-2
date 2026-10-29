import { z } from 'zod'

/**
 * A note page's unsaved text, kept on this phone (per tab session) by the note's address, so
 * switching tabs, a deep link or iOS closing the app loses nothing. `base` is the saved note the
 * edit started from, to notice a change from the partner meanwhile.
 */
export type NoteDraft = { readonly text: string; readonly base: string }

const draftSchema = z.object({ text: z.string(), base: z.string() })

const keyOf = (path: string) => `note-draft:${path}`

export function readNoteDraft(path: string): NoteDraft | null {
  try {
    const raw = sessionStorage.getItem(keyOf(path))
    if (raw === null) return null
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeNoteDraft(path: string, draft: NoteDraft): void {
  try {
    sessionStorage.setItem(keyOf(path), JSON.stringify(draft))
  } catch {
    // storage full or blocked: the draft then lives only on the page
  }
}

export function clearNoteDraft(path: string): void {
  try {
    sessionStorage.removeItem(keyOf(path))
  } catch {
    // nothing to clear
  }
}
