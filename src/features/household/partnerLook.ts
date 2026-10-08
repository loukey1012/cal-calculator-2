import { z } from 'zod'
import type { Profile } from './householdApi'

export const MAX_NICKNAME_LENGTH = 20

/**
 * The symbols for a person, in three groups. The heart is drawn in the chosen color; the emojis
 * sit on a circle tinted with it.
 */
export const SYMBOLS = [
  { value: 'heart', name: 'Heart', group: 'hearts' },
  { value: '❤️', name: 'Red heart', group: 'hearts' },
  { value: '🩷', name: 'Pink heart', group: 'hearts' },
  { value: '🧡', name: 'Orange heart', group: 'hearts' },
  { value: '💛', name: 'Yellow heart', group: 'hearts' },
  { value: '💚', name: 'Green heart', group: 'hearts' },
  { value: '🩵', name: 'Light blue heart', group: 'hearts' },
  { value: '💙', name: 'Blue heart', group: 'hearts' },
  { value: '💜', name: 'Purple heart', group: 'hearts' },
  { value: '🖤', name: 'Black heart', group: 'hearts' },
  { value: '🩶', name: 'Grey heart', group: 'hearts' },
  { value: '🤍', name: 'White heart', group: 'hearts' },
  { value: '🤎', name: 'Brown heart', group: 'hearts' },
  { value: '❤️‍🔥', name: 'Heart on fire', group: 'hearts' },
  { value: '💕', name: 'Two hearts', group: 'hearts' },
  { value: '💞', name: 'Revolving hearts', group: 'hearts' },
  { value: '💖', name: 'Sparkling heart', group: 'hearts' },
  { value: '💗', name: 'Growing heart', group: 'hearts' },
  { value: '💓', name: 'Beating heart', group: 'hearts' },
  { value: '💘', name: 'Heart with arrow', group: 'hearts' },
  { value: '💝', name: 'Heart with ribbon', group: 'hearts' },
  { value: '💟', name: 'Heart decoration', group: 'hearts' },
  { value: '😍', name: 'Heart eyes', group: 'hearts' },
  { value: '🥰', name: 'Smiling with hearts', group: 'hearts' },
  { value: '🌸', name: 'Cherry blossom', group: 'cute' },
  { value: '🌷', name: 'Tulip', group: 'cute' },
  { value: '🌻', name: 'Sunflower', group: 'cute' },
  { value: '🐻', name: 'Bear', group: 'cute' },
  { value: '🧸', name: 'Teddy bear', group: 'cute' },
  { value: '🐼', name: 'Panda', group: 'cute' },
  { value: '🐰', name: 'Bunny', group: 'cute' },
  { value: '🐱', name: 'Cat', group: 'cute' },
  { value: '🐶', name: 'Dog', group: 'cute' },
  { value: '🐣', name: 'Chick', group: 'cute' },
  { value: '🦄', name: 'Unicorn', group: 'cute' },
  { value: '🦋', name: 'Butterfly', group: 'cute' },
  { value: '🍓', name: 'Strawberry', group: 'cute' },
  { value: '🍑', name: 'Peach', group: 'cute' },
  { value: '⭐', name: 'Star', group: 'cute' },
  { value: '🌙', name: 'Moon', group: 'cute' },
  { value: '🌈', name: 'Rainbow', group: 'cute' },
  { value: '☁️', name: 'Cloud', group: 'cute' },
  { value: '🔥', name: 'Fire', group: 'cool' },
  { value: '⚡', name: 'Lightning', group: 'cool' },
  { value: '😎', name: 'Sunglasses', group: 'cool' },
  { value: '👑', name: 'Crown', group: 'cool' },
  { value: '💎', name: 'Gem', group: 'cool' },
  { value: '🚀', name: 'Rocket', group: 'cool' },
  { value: '🦊', name: 'Fox', group: 'cool' },
  { value: '🐺', name: 'Wolf', group: 'cool' },
  { value: '🦁', name: 'Lion', group: 'cool' },
  { value: '🐯', name: 'Tiger', group: 'cool' },
  { value: '🐉', name: 'Dragon', group: 'cool' },
  { value: '🦈', name: 'Shark', group: 'cool' },
  { value: '👻', name: 'Ghost', group: 'cool' },
  { value: '🤖', name: 'Robot', group: 'cool' },
  { value: '👽', name: 'Alien', group: 'cool' },
  { value: '🎧', name: 'Headphones', group: 'cool' },
  { value: '🎮', name: 'Game controller', group: 'cool' },
  { value: '🏀', name: 'Basketball', group: 'cool' },
  { value: '⚽', name: 'Football', group: 'cool' },
  { value: '🏋️', name: 'Weight lifting', group: 'cool' },
  { value: '🍕', name: 'Pizza', group: 'cool' },
  { value: '🌊', name: 'Wave', group: 'cool' },
  { value: '🍀', name: 'Clover', group: 'cool' },
  { value: '☀️', name: 'Sun', group: 'cool' },
] as const

export type SymbolGroup = (typeof SYMBOLS)[number]['group']
export const SYMBOL_GROUP_LABELS: Record<SymbolGroup, string> = {
  hearts: 'Hearts',
  cute: 'Cute',
  cool: 'Cool',
}

export type PersonSymbol = (typeof SYMBOLS)[number]['value']

type SymbolValues = [PersonSymbol, ...PersonSymbol[]]
const SYMBOL_VALUES = SYMBOLS.map(({ value }) => value) as SymbolValues

export const DEFAULT_PARTNER_LOOK = {
  nickname: 'baby',
  symbol: 'heart',
  color: '#ff5c8a',
} as const satisfies { nickname: string; symbol: PersonSymbol; color: string }

const nickname = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0 && Array.from(value).length <= MAX_NICKNAME_LENGTH)
  .optional()
  .catch(undefined)

const symbol = z.enum(SYMBOL_VALUES).optional().catch(undefined)
const color = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .transform((value) => value.toLowerCase())
  .optional()
  .catch(undefined)

function withoutUnset<T extends object>(look: T): T {
  return Object.fromEntries(Object.entries(look).filter(([, value]) => value !== undefined)) as T
}

// each field falls back on its own, like the other appearance choices
const partnerLookSchema = z
  .object({ nickname, symbol, color })
  .catch({})
  .transform((look): PartnerLook => withoutUnset(look))

/** What you picked for each household member, by their id (all optional). */
export type PartnerLook = {
  readonly nickname?: string
  readonly symbol?: PersonSymbol
  readonly color?: string
}
export type PartnerLooks = Readonly<Record<string, PartnerLook>>

// a broken value is dropped as a whole; it is optional, so the other choices are kept
export const partnerLooksSchema = z
  .record(z.string(), partnerLookSchema)
  .optional()
  .catch(undefined)
  .optional()

/** The symbol and color you picked for yourself (only you see them); none: your initial. */
export type OwnLook = { readonly symbol?: PersonSymbol; readonly color?: string }

export const ownLookSchema = z
  .object({ symbol, color })
  .catch({})
  .transform((look): OwnLook => withoutUnset(look))
  .optional()

export type PersonBadge =
  | { readonly kind: 'initial'; readonly color: string }
  | { readonly kind: 'symbol'; readonly symbol: PersonSymbol; readonly color: string }

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
  ownLook?: OwnLook,
): PersonLook {
  if (person.id === viewerId) {
    const ownColor = ownLook?.color ?? person.accent_color
    const badge: PersonBadge = ownLook?.symbol
      ? { kind: 'symbol', symbol: ownLook.symbol, color: ownColor }
      : { kind: 'initial', color: ownColor }
    return { name: displayName(person), badge }
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
