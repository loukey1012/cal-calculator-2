import { describe, expect, test } from 'vitest'
import { ApiError } from '../../lib/errors'
import { categoryErrorMessage, parseCategoryName } from './categoryName'

describe('parseCategoryName', () => {
  test('trims the name', () => {
    expect(parseCategoryName('  Fresh ')).toEqual({ success: true, name: 'Fresh' })
  })

  test.each([
    ['', 'Enter a name'],
    ['   ', 'Enter a name'],
    ['x'.repeat(41), 'Use at most 40 characters'],
  ])('rejects %j', (raw, error) => {
    expect(parseCategoryName(raw)).toEqual({ success: false, error })
  })

  test('accepts exactly 40 characters', () => {
    expect(parseCategoryName('x'.repeat(40)).success).toBe(true)
  })
})

describe('categoryErrorMessage', () => {
  test('a taken name says so', () => {
    expect(categoryErrorMessage(new ApiError('duplicate key value', '23505'))).toBe(
      'That name is already taken.',
    )
  })

  test('anything else gets the usual message', () => {
    expect(categoryErrorMessage(new TypeError('Load failed'))).toBe(
      'No connection. Check your internet and try again.',
    )
  })
})
