import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./authApi', () => ({ signIn: vi.fn(), signUp: vi.fn() }))

import { AuthScreen } from './AuthScreen'
import { signIn, signUp } from './authApi'

beforeEach(() => vi.clearAllMocks())

describe('AuthScreen', () => {
  test('logs in with email and password', async () => {
    vi.mocked(signIn).mockResolvedValue()
    const user = userEvent.setup()
    renderWithProviders(<AuthScreen />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(signIn).toHaveBeenCalledWith({ email: 'me@example.com', password: 'secret123' })
  })

  test('shows field errors and does not call the API for invalid input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthScreen />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  test('shows a friendly message when login fails', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'))
    const user = userEvent.setup()
    renderWithProviders(<AuthScreen />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
  })

  test('signs up with name, email and password', async () => {
    vi.mocked(signUp).mockResolvedValue({ needsEmailConfirmation: false })
    const user = userEvent.setup()
    renderWithProviders(<AuthScreen />)

    await user.click(screen.getByRole('radio', { name: 'Sign up' }))
    await user.type(screen.getByLabelText('Name'), 'Lukas')
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'longenough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(signUp).toHaveBeenCalledWith({
      displayName: 'Lukas',
      email: 'me@example.com',
      password: 'longenough',
    })
  })

  test('after a sign-up that needs email confirmation, asks to confirm and switches to log in', async () => {
    vi.mocked(signUp).mockResolvedValue({ needsEmailConfirmation: true })
    const user = userEvent.setup()
    renderWithProviders(<AuthScreen />)

    await user.click(screen.getByRole('radio', { name: 'Sign up' }))
    await user.type(screen.getByLabelText('Name'), 'Lukas')
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'longenough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Log in' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('me@example.com')
  })
})
