import { describe, expect, test } from 'vitest'
import { fieldErrors } from '../../lib/forms'
import { loginSchema, signUpSchema } from './validation'

describe('loginSchema', () => {
  test('accepts an email and any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'me@example.com', password: 'x' }).success).toBe(true)
  })

  test('reports an invalid email and an empty password per field', () => {
    const result = loginSchema.safeParse({ email: 'nope', password: '' })

    expect(result.success).toBe(false)
    expect(fieldErrors(result.error)).toEqual({
      email: 'Enter a valid email address',
      password: 'Enter your password',
    })
  })
})

describe('signUpSchema', () => {
  test('trims the display name', () => {
    const result = signUpSchema.parse({
      displayName: '  Lukas ',
      email: 'me@example.com',
      password: 'longenough',
    })

    expect(result.displayName).toBe('Lukas')
  })

  test('requires a name and a password of at least 8 characters', () => {
    const result = signUpSchema.safeParse({
      displayName: ' ',
      email: 'me@example.com',
      password: 'short',
    })

    expect(fieldErrors(result.error)).toEqual({
      displayName: 'Enter your name',
      password: 'Use at least 8 characters',
    })
  })
})

describe('fieldErrors', () => {
  test('returns an empty object when there is no error', () => {
    expect(fieldErrors(undefined)).toEqual({})
  })
})
