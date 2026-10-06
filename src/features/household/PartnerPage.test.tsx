import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import type { Json } from '../../lib/database.types'
import { renderWithProviders } from '../../test/render'

vi.mock('./householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))

import { SettingsPage } from '../settings/SettingsPage'
import { useProfile } from './hooks'
import { fetchMembers, fetchProfile, updateProfile, type Profile } from './householdApi'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const HER = { ...ME, id: 'u2', display_name: 'Lisa' }
const PARTNER_PATH = '/settings/partner'

/** Like the app: the signed-in profile comes from its query, so saved changes show up. */
function SignedIn({ children }: { readonly children: ReactNode }) {
  const profile = useProfile(ME.id)
  if (!profile.data) return null
  return (
    <CurrentUserContext value={{ profile: profile.data, householdId: 'h1' }}>
      {children}
    </CurrentUserContext>
  )
}

function renderPage(route: string, appearance: { [key: string]: Json } = {}) {
  // a tiny backend: what was saved is what the next fetch returns
  let stored: Profile = { ...ME, appearance }
  vi.mocked(fetchProfile).mockImplementation(async () => stored)
  vi.mocked(updateProfile).mockImplementation(async (_id, patch) => {
    stored = { ...stored, ...patch }
  })
  return renderWithProviders(
    <SignedIn>
      <SettingsPage />
    </SignedIn>,
    { route },
  )
}

function radio(group: string, name: string) {
  return within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name })
}

/** The partner looks of the last saved appearance. */
function savedLooks() {
  const [, patch] = vi.mocked(updateProfile).mock.lastCall ?? []
  return (patch?.appearance as { partnerLooks?: unknown } | undefined)?.partnerLooks
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMembers).mockResolvedValue([HER, ME])
})

describe('Settings › Members', () => {
  test('shows your partner by nickname, with the account name beside it, and opens the page', async () => {
    const user = userEvent.setup()
    renderPage('/settings')

    const row = await screen.findByRole('button', { name: /baby/ })
    expect(row).toHaveTextContent('Lisa')
    expect(within(row).getByTestId('partner-badge')).toBeInTheDocument()
    expect(screen.getByText('Lukas (you)')).toBeInTheDocument()
    await user.click(row)

    expect(await screen.findByRole('heading', { level: 1, name: 'Partner' })).toBeInTheDocument()
  })
})

describe('Partner page', () => {
  test('starts as "baby" with a rose heart', async () => {
    renderPage(PARTNER_PATH)

    expect(await screen.findByLabelText('Nickname')).toHaveValue('baby')
    expect(radio('Symbol', 'Heart')).toBeChecked()
    expect(radio('Color', 'Rose')).toBeChecked()
    expect(screen.getByText(/Account name: Lisa/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset/ })).toBeDisabled()
  })

  test('saves a new nickname when you leave the field', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH, { theme: 'dark' })

    const field = await screen.findByLabelText('Nickname')
    await user.clear(field)
    await user.type(field, '  Schatz ')
    await user.tab()

    expect(updateProfile).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateProfile).mock.lastCall?.[1].appearance).toMatchObject({ theme: 'dark' })
    expect(savedLooks()).toEqual({ u2: { nickname: 'Schatz' } })
    expect(screen.getByTestId('partner-preview')).toHaveTextContent('Schatz')
  })

  test('saves on Enter, and leaving it unchanged saves nothing', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH)

    const field = await screen.findByLabelText('Nickname')
    await user.click(field)
    await user.tab()
    expect(updateProfile).not.toHaveBeenCalled()

    await user.clear(field)
    await user.type(field, 'Bubu{Enter}')
    expect(savedLooks()).toEqual({ u2: { nickname: 'Bubu' } })
  })

  test('an empty nickname goes back to "baby"', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH, { partnerLooks: { u2: { nickname: 'Schatz', symbol: '🐻' } } })

    const field = await screen.findByLabelText('Nickname')
    await user.clear(field)
    await user.tab()

    expect(savedLooks()).toEqual({ u2: { symbol: '🐻' } })
    expect(field).toHaveValue('baby')
  })

  test('picks an emoji and a color', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH, { partnerLooks: { u2: { nickname: 'Schatz' } } })

    await screen.findByLabelText('Nickname')
    await user.click(radio('Symbol', 'Bunny'))
    expect(savedLooks()).toEqual({ u2: { nickname: 'Schatz', symbol: '🐰' } })
    expect(screen.getByTestId('partner-preview')).toHaveTextContent('🐰')

    await user.click(radio('Color', 'Lavender'))
    expect(savedLooks()).toEqual({ u2: { nickname: 'Schatz', symbol: '🐰', color: '#a78bfa' } })
  })

  test('reset goes back to "baby" and the heart', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH, { partnerLooks: { u2: { nickname: 'Schatz', symbol: '🐻' } } })

    await user.click(await screen.findByRole('button', { name: /Reset/ }))

    expect(savedLooks()).toEqual({})
    expect(screen.getByLabelText('Nickname')).toHaveValue('baby')
    expect(radio('Symbol', 'Heart')).toBeChecked()
  })

  test('shows an error and keeps the old look when saving fails', async () => {
    const user = userEvent.setup()
    renderPage(PARTNER_PATH)
    vi.mocked(updateProfile).mockRejectedValue(new Error('offline'))

    await user.click(await screen.findByRole('radio', { name: 'Bunny' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(radio('Symbol', 'Heart')).toBeChecked()
  })

  test('says so when you have no partner in the household yet', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([ME])
    renderPage(PARTNER_PATH)

    expect(await screen.findByText(/No partner yet/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nickname')).not.toBeInTheDocument()
  })
})
