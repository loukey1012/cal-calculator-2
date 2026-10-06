import { describe, expect, test } from 'vitest'
import { parseAppearance } from '../appearance/appearance'
import type { Profile } from './householdApi'
import {
  DEFAULT_PARTNER_LOOK,
  lookFor,
  MAX_NICKNAME_LENGTH,
  PARTNER_COLORS,
  PARTNER_SYMBOLS,
  withPartnerLook,
  type PartnerLooks,
} from './partnerLook'

function profile(id: string, name: string, accent = '#007aff'): Profile {
  return {
    id,
    household_id: 'h1',
    display_name: name,
    accent_color: accent,
    appearance: {},
    created_at: '',
    updated_at: '',
  }
}

const ME = profile('u1', 'Lukas')
const HER = profile('u2', 'Lisa', '#30a46c')

describe('partner looks in the appearance', () => {
  test('are read per member', () => {
    const stored = { partnerLooks: { u2: { nickname: 'Schatz', symbol: '🐻', color: '#a78bfa' } } }

    expect(parseAppearance(stored).partnerLooks).toEqual(stored.partnerLooks)
  })

  test('an invalid field falls back on its own, keeping the others', () => {
    const stored = { partnerLooks: { u2: { nickname: 'Schatz', symbol: '🚗', color: 'pink' } } }

    expect(parseAppearance(stored).partnerLooks).toEqual({ u2: { nickname: 'Schatz' } })
  })

  test('nicknames are trimmed, and empty or too long ones are dropped', () => {
    const tooLong = 'x'.repeat(MAX_NICKNAME_LENGTH + 1)
    const stored = {
      partnerLooks: {
        a: { nickname: '  Bubu  ' },
        b: { nickname: '   ' },
        c: { nickname: tooLong },
      },
    }

    expect(parseAppearance(stored).partnerLooks).toEqual({
      a: { nickname: 'Bubu' },
      b: {},
      c: {},
    })
  })

  test('a broken value is ignored without touching the other choices', () => {
    const appearance = parseAppearance({ theme: 'dark', partnerLooks: 'baby' })

    expect(appearance.theme).toBe('dark')
    expect(appearance.partnerLooks).toBeUndefined()
  })
})

describe('lookFor', () => {
  test('your partner is "baby" with a heart until you change it', () => {
    expect(DEFAULT_PARTNER_LOOK).toEqual({ nickname: 'baby', symbol: 'heart', color: '#ff5c8a' })
    expect(lookFor(HER, ME.id, undefined)).toEqual({
      name: 'baby',
      badge: { kind: 'symbol', symbol: 'heart', color: '#ff5c8a' },
    })
  })

  test('uses the nickname, symbol and color you picked', () => {
    const looks: PartnerLooks = { u2: { nickname: 'Schatz', symbol: '🐰', color: '#a78bfa' } }

    expect(lookFor(HER, ME.id, looks)).toEqual({
      name: 'Schatz',
      badge: { kind: 'symbol', symbol: '🐰', color: '#a78bfa' },
    })
  })

  test('fills in defaults for what you did not pick', () => {
    expect(lookFor(HER, ME.id, { u2: { symbol: '🍓' } })).toEqual({
      name: 'baby',
      badge: { kind: 'symbol', symbol: '🍓', color: '#ff5c8a' },
    })
  })

  test('you keep your own account name and initial', () => {
    expect(lookFor(ME, ME.id, { u1: { nickname: 'Me' } })).toEqual({
      name: 'Lukas',
      badge: { kind: 'initial', color: '#007aff' },
    })
  })
})

describe('withPartnerLook', () => {
  test('replaces one member’s look, keeping only current members', () => {
    const looks: PartnerLooks = {
      gone: { nickname: 'Old' },
      u2: { nickname: 'Schatz', symbol: '🐻' },
    }

    const next = withPartnerLook(looks, 'u2', { symbol: '🐻', color: '#4cc9a0' }, ['u1', 'u2'])

    expect(next).toEqual({ u2: { symbol: '🐻', color: '#4cc9a0' } })
    expect(looks.u2).toEqual({ nickname: 'Schatz', symbol: '🐻' })
  })

  test('resetting removes the member’s look', () => {
    expect(withPartnerLook({ u2: { nickname: 'Schatz' } }, 'u2', null, ['u1', 'u2'])).toEqual({})
  })
})

describe('choices', () => {
  test('the heart comes first, then cute emojis', () => {
    expect(PARTNER_SYMBOLS[0]).toEqual({ value: 'heart', name: 'Heart' })
    expect(PARTNER_SYMBOLS.length).toBeGreaterThanOrEqual(12)
    expect(new Set(PARTNER_SYMBOLS.map(({ value }) => value)).size).toBe(PARTNER_SYMBOLS.length)
  })

  test('the colors are distinct and include the default', () => {
    const values = PARTNER_COLORS.map(({ value }) => value)
    expect(new Set(values).size).toBe(values.length)
    expect(values).toContain(DEFAULT_PARTNER_LOOK.color)
  })
})
