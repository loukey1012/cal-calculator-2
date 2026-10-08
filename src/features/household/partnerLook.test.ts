import { describe, expect, test } from 'vitest'
import { COLOR_PRESETS } from '../appearance/colorPresets'
import { parseAppearance } from '../appearance/appearance'
import type { Profile } from './householdApi'
import {
  DEFAULT_PARTNER_LOOK,
  lookFor,
  MAX_NICKNAME_LENGTH,
  SYMBOLS,
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
  test('the drawn heart (the default) comes first', () => {
    expect(SYMBOLS[0]).toEqual({ value: 'heart', name: 'Heart', group: 'hearts' })
    expect(SYMBOLS[0].value).toBe(DEFAULT_PARTNER_LOOK.symbol)
  })

  test('the default color is one of the preset colors', () => {
    expect(COLOR_PRESETS.map(({ value }) => value)).toContain(DEFAULT_PARTNER_LOOK.color)
  })
})

describe('the symbols', () => {
  test('include all the classic hearts, the pink one too', () => {
    const values = SYMBOLS.map(({ value }) => value)

    for (const heart of ['❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🖤', '🤍', '🤎']) {
      expect(values).toContain(heart)
    }
    expect(SYMBOLS.find(({ value }) => value === '🩷')?.name).toBe('Pink heart')
  })

  test('come in three groups: hearts first, then cute ones, then cool ones', () => {
    const groups = [...new Set(SYMBOLS.map(({ group }) => group))]

    expect(groups).toEqual(['hearts', 'cute', 'cool'])
    expect(SYMBOLS.filter(({ group }) => group === 'cool').map(({ value }) => value)).toEqual(
      expect.arrayContaining(['🔥', '😎', '👑', '🦊', '🐉', '🚀']),
    )
  })

  test('are distinct by value and by name (names are what a screen reader says)', () => {
    expect(new Set(SYMBOLS.map(({ value }) => value)).size).toBe(SYMBOLS.length)
    expect(new Set(SYMBOLS.map(({ name }) => name)).size).toBe(SYMBOLS.length)
  })
})

describe('your own look', () => {
  test('without a choice: your initial in your accent color', () => {
    expect(lookFor(ME, ME.id, undefined, undefined)).toEqual({
      name: 'Lukas',
      badge: { kind: 'initial', color: '#007aff' },
    })
  })

  test('a symbol in the color you picked; your name stays your account name', () => {
    expect(lookFor(ME, ME.id, undefined, { symbol: '🩷', color: '#ff5c8a' })).toEqual({
      name: 'Lukas',
      badge: { kind: 'symbol', symbol: '🩷', color: '#ff5c8a' },
    })
  })

  test('a symbol without a color is shown in your accent color', () => {
    expect(lookFor(ME, ME.id, undefined, { symbol: '🔥' }).badge).toEqual({
      kind: 'symbol',
      symbol: '🔥',
      color: '#007aff',
    })
  })

  test('a color alone colors your initial', () => {
    expect(lookFor(ME, ME.id, undefined, { color: '#30a46c' }).badge).toEqual({
      kind: 'initial',
      color: '#30a46c',
    })
  })

  test('does not change how your partner is shown', () => {
    expect(lookFor(HER, ME.id, undefined, { symbol: '🔥' }).badge).toMatchObject({
      symbol: 'heart',
    })
  })

  test('is read from the appearance; an unknown symbol or color falls back on its own', () => {
    expect(parseAppearance({ ownLook: { symbol: '🩷', color: '#FF5C8A' } }).ownLook).toEqual({
      symbol: '🩷',
      color: '#ff5c8a',
    })
    expect(parseAppearance({ ownLook: { symbol: '🚗', color: 'pink' } }).ownLook).toEqual({})
    expect(parseAppearance({}).ownLook).toBeUndefined()
  })
})
