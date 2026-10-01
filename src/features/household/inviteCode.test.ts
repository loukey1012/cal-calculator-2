import { describe, expect, test } from 'vitest'
import { formatInviteCode, isValidInviteCode, normalizeInviteCode } from './inviteCode'

describe('invite codes', () => {
  test('normalizes case, spaces and dashes', () => {
    expect(normalizeInviteCode(' abcd-efgh jkmn ')).toBe('ABCDEFGHJKMN')
  })

  test('accepts 12 characters from the unambiguous alphabet in any format', () => {
    expect(isValidInviteCode('4y5r-fxky-mj4p')).toBe(true)
  })

  test.each(['ABCDEFGHIJKL', 'ABCDEFGH0JKL', 'SHORT', 'ABCDEFGHJKMNP'])('rejects %s', (code) => {
    expect(isValidInviteCode(code)).toBe(false)
  })

  test('formats into groups of four for display', () => {
    expect(formatInviteCode('4Y5RFXKYMJ4P')).toBe('4Y5R-FXKY-MJ4P')
  })
})
