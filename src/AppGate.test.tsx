import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from './test/render'

vi.mock('./features/auth/authContext', () => ({ useAuth: vi.fn() }))
vi.mock('./features/auth/authApi', () => ({ signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }))
vi.mock('./features/household/householdApi', () => ({
  fetchProfile: vi.fn(),
  fetchHousehold: vi.fn(),
  fetchMembers: vi.fn(),
  createHousehold: vi.fn(),
  joinHousehold: vi.fn(),
}))

import { AppGate } from './AppGate'
import { useAuth } from './features/auth/authContext'
import { fetchHousehold, fetchMembers, fetchProfile } from './features/household/householdApi'

const SIGNED_IN = { status: 'signedIn', session: { user: { id: 'u1' } } } as never
const PROFILE = {
  id: 'u1',
  household_id: null,
  display_name: 'Lukas',
  accent_color: '#007aff',
  created_at: '',
  updated_at: '',
}

beforeEach(() => vi.clearAllMocks())

describe('AppGate', () => {
  test('shows a loading state while the session is restored', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'loading' })
    renderWithProviders(<AppGate />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  test('shows the login screen when signed out', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'signedOut' })
    renderWithProviders(<AppGate />)

    expect(screen.getByRole('heading', { level: 1, name: 'CALculator2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  test('sends a signed-in user without a household to onboarding', async () => {
    vi.mocked(useAuth).mockReturnValue(SIGNED_IN)
    vi.mocked(fetchProfile).mockResolvedValue(PROFILE)
    renderWithProviders(<AppGate />)

    expect(await screen.findByText('Set up your household')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledWith('u1')
  })

  test('shows the tabbed app for a household member', async () => {
    vi.mocked(useAuth).mockReturnValue(SIGNED_IN)
    vi.mocked(fetchProfile).mockResolvedValue({ ...PROFILE, household_id: 'h1' })
    vi.mocked(fetchHousehold).mockResolvedValue({
      id: 'h1',
      name: 'Home',
      invite_code: '4Y5RFXKYMJ4P',
      created_at: '',
    })
    vi.mocked(fetchMembers).mockResolvedValue([])
    renderWithProviders(<AppGate />)

    expect(await screen.findByRole('navigation', { name: 'Tabs' })).toBeInTheDocument()
  })

  test('shows a retryable error when the profile cannot be loaded', async () => {
    vi.mocked(useAuth).mockReturnValue(SIGNED_IN)
    vi.mocked(fetchProfile)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(PROFILE)
    const user = userEvent.setup()
    renderWithProviders(<AppGate />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Set up your household')).toBeInTheDocument()
  })
})
