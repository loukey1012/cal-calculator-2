import { describe, expect, test } from 'vitest'
import { pushOutcome, tally } from './pushOutcome'

describe('pushOutcome', () => {
  test.each([
    [201, 'sent'],
    [200, 'sent'],
    [404, 'gone'],
    [410, 'gone'],
    [400, 'failed'],
    [413, 'failed'],
    [429, 'failed'],
    [500, 'failed'],
    [undefined, 'failed'],
  ])('status %s → %s', (status, outcome) => {
    expect(pushOutcome(status)).toBe(outcome)
  })
})

describe('tally', () => {
  test('counts each outcome', () => {
    expect(tally(['sent', 'gone', 'sent', 'failed'])).toEqual({ sent: 2, removed: 1, failed: 1 })
  })
})
