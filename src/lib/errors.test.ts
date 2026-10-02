import { describe, expect, test } from 'vitest'
import { ApiError, isNetworkError, toUserMessage } from './errors'

describe('toUserMessage', () => {
  test.each([
    ['Invalid login credentials', 'Wrong email or password.'],
    ['User already registered', 'An account with this email already exists. Try logging in.'],
    ['Email not confirmed', 'Please confirm your email first. Check your inbox.'],
    ['Signups not allowed for this instance', 'Sign-ups are closed for this app.'],
    ['email rate limit exceeded', 'Too many attempts. Please wait a minute and try again.'],
    ['You are already in a household', 'You are already in a household.'],
    ['Invalid invite code', 'That invite code doesn’t match any household.'],
    [
      'new row for relation "ingredients" violates check constraint "ingredients_has_kcal"',
      'Some values aren’t allowed. Check the numbers and try again.',
    ],
    ['duplicate key value violates unique constraint', 'This already exists.'],
  ])('maps "%s" to a friendly message', (raw, friendly) => {
    expect(toUserMessage(new Error(raw))).toBe(friendly)
  })

  test.each(['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'])(
    'maps network failure "%s" to a connection message',
    (raw) => {
      expect(toUserMessage(new TypeError(raw))).toBe(
        'No connection. Check your internet and try again.',
      )
    },
  )

  test('falls back to a generic message for unknown errors and non-errors', () => {
    expect(toUserMessage(new Error('boom'))).toBe('Something went wrong. Please try again.')
    expect(toUserMessage('nope')).toBe('Something went wrong. Please try again.')
    expect(toUserMessage(undefined)).toBe('Something went wrong. Please try again.')
  })
})

describe('isNetworkError', () => {
  test('recognises failed requests, not server answers', () => {
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true)
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new ApiError('permission denied', '42501'))).toBe(false)
    // supabase-js returns failed requests as an error object, which the API layer wraps
    expect(isNetworkError(ApiError.from({ message: 'TypeError: Load failed', code: '' }))).toBe(
      true,
    )
    expect(isNetworkError('Load failed')).toBe(false)
  })
})

describe('ApiError', () => {
  test('wraps a supabase error object, keeping message and code', () => {
    const error = ApiError.from({ message: 'Invalid invite code', code: 'P0001' })

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Invalid invite code')
    expect(error.code).toBe('P0001')
    expect(toUserMessage(error)).toBe('That invite code doesn’t match any household.')
  })
})
