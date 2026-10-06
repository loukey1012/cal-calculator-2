import { z } from 'zod'
import type { Profile } from './householdApi'

export const MAX_NICKNAME_LENGTH = 20

/** The heart is drawn in the chosen color; the emojis sit on a circle tinted with it. */
export const PARTNER_SYMBOLS = [
  { value: 'heart', name: 'Heart' },
  { value: '💕', name: 'Two hearts' },
  { value: '💖', name: 'Sparkling heart' },
  { value: '💗', name: 'Growing heart' },
  { value: '🌸', name: 'Cherry blossom' },
  { value: '🌷', name: 'Tulip' },
  { value: '🐻', name: 'Bear' },
  { value: '🧸', name: 'Teddy bear' },
  { value: '🐰', name: 'Bunny' },
  { value: '🐱', name: 'Cat' },
  { value: '🐣', name: 'Chick' },
  { value: '🦋', name: 'Butterfly' },
  { value: '🍓', name: 'Strawberry' },
  { value: '🍑', name: 'Peach' },
  { value: '⭐', name: 'Star' },
  { value: '🌙', name: 'Moon' },
  { value: '🌈', name: 'Rainbow' },
  { value: '☁️', name: 'Cloud' },
] as const

/** Soft, cute colors that still read on light, pink and dark cards. */
export const PARTNER_COLORS = [
  { name: 'Rose', value: '#ff5c8a' },
  { name: 'Blush', value: '#f78fb3' },
  { name: 'Berry', value: '#c2417e' },
  { name: 'Cherry', value: '#e63950' },
  { name: 'Coral', value: '#ff6f61' },
  { name: 'Peach', value: '#ff9f7a' },
  { name: 'Butter', value: '#f5c84c' },
  { name: 'Mint', value: '#4cc9a0' },
  { name: 'Sage', value: '#8fb996' },
  { name: 'Sky', value: '#5ab4f0' },
  { name: 'Lavender', value: '#a78bfa' },
  { name: 'Lilac', value: '#d18cf0' },
] as const

export type PartnerSymbol = (typeof PARTNER_SYMBOLS)[number]['value']

type SymbolValues = [PartnerSymbol, ...PartnerSymbol[]]
const SYMBOL_VALUES = PARTNER_SYMBOLS.map(({ value }) => value) as SymbolValues

export const DEFAULT_PARTNER_LOOK = {
  nickname: 'baby',
  symbol: 'heart',
  color: '#ff5c8a',
} as const satisfies { nickname: string; symbol: PartnerSymbol; color: string }

const nickname = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0 && Array.from(value).length <= MAX_NICKNAME_LENGTH)
  .optional()
  .catch(undefined)

// each field falls back on its own, like the other appearance choices
const partnerLookSchema = z
  .object({
    nickname,
    symbol: z.enum(SYMBOL_VALUES).optional().catch(undefined),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .transform((color) => color.toLowerCase())
      .optional()
      .catch(undefined),
  })
  .catch({})
  .transform((look): PartnerLook =>
    Object.fromEntries(Object.entries(look).filter(([, value]) => value !== undefined)),
  )

/** What you picked for each household member, by their id (all optional). */
export type PartnerLook = {
  readonly nickname?: string
  readonly symbol?: PartnerSymbol
  readonly color?: string
}
export type PartnerLooks = Readonly<Record<string, PartnerLook>>

// a broken value is dropped as a whole; it is optional, so the other choices are kept
export const partnerLooksSchema = z
  .record(z.string(), partnerLookSchema)
  .optional()
  .catch(undefined)
  .optional()

export type PersonBadge =
  | { readonly kind: 'initial'; readonly color: string }
  | { readonly kind: 'symbol'; readonly symbol: PartnerSymbol; readonly color: string }

/** How a household member is shown to the viewer: their name and the badge next to it. */
export type PersonLook = { readonly name: string; readonly badge: PersonBadge }

/** Your account name; shown for yourself, and as the "real" name next to a nickname. */
export function displayName(member: Profile): string {
  return member.display_name || 'Unnamed'
}

export function lookFor(
  person: Profile,
  viewerId: string,
  looks: PartnerLooks | undefined,
): PersonLook {
  if (person.id === viewerId) {
    return { name: displayName(person), badge: { kind: 'initial', color: person.accent_color } }
  }
  const look = { ...DEFAULT_PARTNER_LOOK, ...looks?.[person.id] }
  return { name: look.nickname, badge: { kind: 'symbol', symbol: look.symbol, color: look.color } }
}

/**
 * The looks with one member's replaced by `look` (or removed with null). Looks for people no longer in
 * the household are dropped, so the stored appearance never grows past its size limit.
 */
export function withPartnerLook(
  looks: PartnerLooks | undefined,
  memberId: string,
  look: PartnerLook | null,
  memberIds: readonly string[],
): PartnerLooks {
  const kept = Object.entries(looks ?? {}).filter(
    ([id]) => id !== memberId && memberIds.includes(id),
  )
  const changed = look === null ? [] : [[memberId, look] as const]
  return Object.fromEntries([...kept, ...changed])
}
