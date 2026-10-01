import { describe, expect, test } from 'vitest'
import { householdNameSchema, inviteCodeSchema } from './validation'

describe('householdNameSchema', () => {
  test('trims the name', () => {
    expect(householdNameSchema.parse('  Home ')).toBe('Home')
  })

  test('rejects an empty or overly long name', () => {
    expect(householdNameSchema.safeParse('   ').error?.issues[0]?.message).toBe(
      'Enter a household name',
    )
    expect(householdNameSchema.safeParse('x'.repeat(61)).success).toBe(false)
  })
})

describe('inviteCodeSchema', () => {
  test('normalizes a valid code', () => {
    expect(inviteCodeSchema.parse('abcd efgh-jkmn')).toBe('ABCDEFGHJKMN')
  })

  test('explains the expected format for an invalid code', () => {
    expect(inviteCodeSchema.safeParse('abc').error?.issues[0]?.message).toBe(
      'Invite codes have 12 letters and numbers',
    )
  })
})
