import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { APPEARANCE_CACHE_KEY, PERSIST_KEY } from '../../lib/persistence'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(),
  fetchMembers: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))

import { signOut } from '../auth/authApi'
import { fetchGoals } from '../goals/goalsApi'
import { fetchHousehold, fetchMembers, updateProfile } from '../household/householdApi'
import { SettingsPage } from './SettingsPage'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const PARTNER = { ...ME, id: 'u2', display_name: 'Anna' }
const HOUSEHOLD = { id: 'h1', name: 'Home', invite_code: '4Y5RFXKYMJ4P', created_at: '' }

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchHousehold).mockResolvedValue(HOUSEHOLD)
  vi.mocked(fetchMembers).mockResolvedValue([PARTNER, ME])
  vi.mocked(fetchGoals).mockResolvedValue([
    { validFrom: '2026-09-01', kcal: 2000, proteinG: 120, carbsG: null, fatG: null, fiberG: null },
  ])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SettingsPage', () => {
  test('shows the account, the household and its members', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Lukas')).toBeInTheDocument()
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Lukas (you)')).toBeInTheDocument()
    expect(screen.getByText('4Y5R-FXKY-MJ4P')).toBeInTheDocument()
  })

  test('shows the running version at the bottom', () => {
    renderPage()

    // the test build's version (vitest.config.ts)
    expect(screen.getByText(/^Version .+ · test123$/)).toBeInTheDocument()
  })

  test('changes the name and refreshes the profile', async () => {
    vi.mocked(updateProfile).mockResolvedValue()
    const user = userEvent.setup()
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: /Name/ }))
    const name = screen.getByLabelText('Your name')
    expect(name).toHaveValue('Lukas')
    await user.clear(name)
    await user.type(name, '  Luki ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('u1', { display_name: 'Luki' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['profile'] }))
  })

  test('an empty name is rejected', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Name/ }))
    await user.clear(screen.getByLabelText('Your name'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter your name')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  test('opens Appearance, summarising the current look', async () => {
    const user = userEvent.setup()
    renderPage()

    const row = screen.getByRole('button', { name: /Appearance/ })
    expect(row).toHaveTextContent('System · Classic / Soft')
    await user.click(row)

    expect(await screen.findByRole('heading', { level: 1, name: 'Appearance' })).toBeInTheDocument()
  })

  test('opens the category management', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^Categories/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument()
  })

  test('explains when a profile change fails', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new TypeError('Load failed'))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Name/ }))
    await user.type(screen.getByLabelText('Your name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
  })

  test('shows the current daily goal and opens it for editing', async () => {
    const user = userEvent.setup()
    renderPage()

    const goalRow = await screen.findByRole('button', { name: /Daily goal/ })
    await waitFor(() => expect(goalRow).toHaveTextContent('2,000 kcal · P 120 g'))
    await user.click(goalRow)

    expect(screen.getByRole('dialog', { name: 'Daily Goal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Calories')).toHaveValue('2000')
  })

  test('says when the goal could not be loaded instead of pretending none is set', async () => {
    vi.mocked(fetchGoals).mockRejectedValue(new TypeError('Load failed'))
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Daily goal/ })).toHaveTextContent('Couldn’t load'),
    )
  })

  test('says when no goal is set yet', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([])
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Daily goal/ })).toHaveTextContent('Not set'),
    )
  })

  test('shares the invite code via the iOS share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(share).toHaveBeenCalledWith({
      text: 'Join my household in CALculator with the code 4Y5R-FXKY-MJ4P',
    })
  })

  test('falls back to copying the code when sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // after setup(): user-event installs its own clipboard stub
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(writeText).toHaveBeenCalledWith('4Y5R-FXKY-MJ4P')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  test('ignores a cancelled share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    vi.stubGlobal('navigator', { ...navigator, share })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows an error when sharing fails', async () => {
    const share = vi.fn().mockRejectedValue(new TypeError('Load failed'))
    vi.stubGlobal('navigator', { ...navigator, share })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Share invite code' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
  })

  test('shows an error when loading the household fails', async () => {
    vi.mocked(fetchHousehold).mockRejectedValue(new TypeError('Load failed'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No connection. Check your internet and try again.',
    )
  })

  test('logs out', async () => {
    vi.mocked(signOut).mockResolvedValue()
    const user = userEvent.setup()
    renderPage()

    window.localStorage.setItem(PERSIST_KEY, '{"cached":"day data"}')
    window.localStorage.setItem(APPEARANCE_CACHE_KEY, '{"theme":"dark"}')
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(signOut).toHaveBeenCalled()
    // nothing of this account stays on the phone
    await waitFor(() => expect(window.localStorage.getItem(PERSIST_KEY)).toBeNull())
    // the next person on this phone must not start in this account's colors
    expect(window.localStorage.getItem(APPEARANCE_CACHE_KEY)).toBeNull()
  })
})
