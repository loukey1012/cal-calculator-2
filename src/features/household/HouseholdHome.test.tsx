import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./householdApi', () => ({ fetchHousehold: vi.fn(), fetchMembers: vi.fn() }))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))

import { signOut } from '../auth/authApi'
import { fetchHousehold, fetchMembers } from './householdApi'
import { HouseholdHome } from './HouseholdHome'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  created_at: '',
  updated_at: '',
}
const PARTNER = { ...ME, id: 'u2', display_name: 'Anna' }
const HOUSEHOLD = { id: 'h1', name: 'Home', invite_code: '4Y5RFXKYMJ4P', created_at: '' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchHousehold).mockResolvedValue(HOUSEHOLD)
  vi.mocked(fetchMembers).mockResolvedValue([PARTNER, ME])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HouseholdHome', () => {
  test('greets the user and lists the household and its members', async () => {
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    expect(screen.getByText('Hi, Lukas')).toBeInTheDocument()
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Lukas (you)')).toBeInTheDocument()
    expect(screen.getByText('4Y5R-FXKY-MJ4P')).toBeInTheDocument()
  })

  test('shares the invite code via the iOS share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    const user = userEvent.setup()
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(share).toHaveBeenCalledWith({
      text: 'Join my household in CALculator2 with the code 4Y5R-FXKY-MJ4P',
    })
  })

  test('falls back to copying the code when sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // after setup(): user-event installs its own clipboard stub
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(writeText).toHaveBeenCalledWith('4Y5R-FXKY-MJ4P')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  test('ignores a cancelled share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    vi.stubGlobal('navigator', { ...navigator, share })
    const user = userEvent.setup()
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows an error when loading the household fails', async () => {
    vi.mocked(fetchHousehold).mockRejectedValue(new TypeError('Load failed'))
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No connection. Check your internet and try again.',
    )
  })

  test('logs out', async () => {
    vi.mocked(signOut).mockResolvedValue()
    const user = userEvent.setup()
    renderWithProviders(<HouseholdHome profile={ME} householdId="h1" />)

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).toHaveBeenCalled()
  })
})
