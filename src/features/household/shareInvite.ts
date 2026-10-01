import { formatInviteCode } from './inviteCode'

export type ShareOutcome = 'shared' | 'copied' | 'cancelled'

/** Opens the iOS share sheet, or copies the code where sharing isn't available. */
export async function shareInviteCode(code: string): Promise<ShareOutcome> {
  const formatted = formatInviteCode(code)
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: `Join my household in CALculator2 with the code ${formatted}` })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }
  await navigator.clipboard.writeText(formatted)
  return 'copied'
}
