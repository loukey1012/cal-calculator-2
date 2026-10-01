import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./householdApi', () => ({ createHousehold: vi.fn(), joinHousehold: vi.fn() }))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))

import { signOut } from '../auth/authApi'
import { createHousehold, joinHousehold } from './householdApi'
import { OnboardingScreen } from './OnboardingScreen'

const HOUSEHOLD = { id: 'h1', name: 'Home', invite_code: '4Y5RFXKYMJ4P', created_at: '' }

beforeEach(() => vi.clearAllMocks())

describe('OnboardingScreen', () => {
  test('creates a household and refreshes the profile', async () => {
    vi.mocked(createHousehold).mockResolvedValue(HOUSEHOLD)
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<OnboardingScreen />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.type(screen.getByLabelText('Household name'), '  Home ')
    await user.click(screen.getByRole('button', { name: 'Create household' }))

    expect(createHousehold).toHaveBeenCalledWith('Home')
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['profile'] }))
  })

  test('joins with an invite code typed in any format', async () => {
    vi.mocked(joinHousehold).mockResolvedValue(HOUSEHOLD)
    const user = userEvent.setup()
    renderWithProviders(<OnboardingScreen />)

    await user.click(screen.getByRole('radio', { name: 'Join' }))
    await user.type(screen.getByLabelText('Invite code'), '4y5r-fxky-mj4p')
    await user.click(screen.getByRole('button', { name: 'Join household' }))

    expect(joinHousehold).toHaveBeenCalledWith('4Y5RFXKYMJ4P')
  })

  test('rejects a malformed invite code without calling the server', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingScreen />)

    await user.click(screen.getByRole('radio', { name: 'Join' }))
    await user.type(screen.getByLabelText('Invite code'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Join household' }))

    expect(screen.getByText('Invite codes have 12 letters and numbers')).toBeInTheDocument()
    expect(joinHousehold).not.toHaveBeenCalled()
  })

  test('shows the server error when the invite code is unknown', async () => {
    vi.mocked(joinHousehold).mockRejectedValue(new Error('Invalid invite code'))
    const user = userEvent.setup()
    renderWithProviders(<OnboardingScreen />)

    await user.click(screen.getByRole('radio', { name: 'Join' }))
    await user.type(screen.getByLabelText('Invite code'), 'AAAABBBBCCCC')
    await user.click(screen.getByRole('button', { name: 'Join household' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That invite code doesn’t match any household.',
    )
  })

  test('requires a household name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OnboardingScreen />)

    await user.click(screen.getByRole('button', { name: 'Create household' }))

    expect(screen.getByText('Enter a household name')).toBeInTheDocument()
    expect(createHousehold).not.toHaveBeenCalled()
  })

  test('lets the user log out (e.g. wrong account)', async () => {
    vi.mocked(signOut).mockResolvedValue()
    const user = userEvent.setup()
    renderWithProviders(<OnboardingScreen />)

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).toHaveBeenCalled()
  })
})
