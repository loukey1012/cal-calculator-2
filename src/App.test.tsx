import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('./features/auth/authApi', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  onSessionChange: vi.fn(() => () => {}),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('./features/household/householdApi', () => ({}))

import App from './App'

describe('App', () => {
  test('wires providers together and shows the login screen when signed out', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'CALculator' })).toBeInTheDocument()
  })
})
