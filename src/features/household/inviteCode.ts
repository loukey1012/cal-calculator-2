// Matches private.generate_invite_code(): 12 chars, no look-alikes (I, O, 0, 1)
export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/
const DISPLAY_GROUP = /.{1,4}/g

export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidInviteCode(raw: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(raw))
}

export function formatInviteCode(code: string): string {
  return code.match(DISPLAY_GROUP)?.join('-') ?? code
}
