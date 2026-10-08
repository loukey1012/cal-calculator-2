import { fireEvent, screen, within, waitFor } from '@testing-library/react'
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
const OWN_LOOK_PATH = '/settings/me'

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

/** Your own look in the last saved appearance. */
function savedOwnLook() {
  const [, patch] = vi.mocked(updateProfile).mock.lastCall ?? []
  return (patch?.appearance as { ownLook?: unknown } | undefined)?.ownLook
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMembers).mockResolvedValue([HER, ME])
})

describe('Settings › your symbol', () => {
  test('opens from your row under Members, and from Account', async () => {
    const user = userEvent.setup()
    renderPage('/settings')

    await user.click(await screen.findByRole('button', { name: /Lukas \(you\)/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your symbol' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: /^Symbol/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your symbol' })).toBeInTheDocument()
  })

  test('starts with your initial; only you see the choice', async () => {
    renderPage(OWN_LOOK_PATH)

    expect(await screen.findByRole('radio', { name: 'Initial' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText(/Only you see it/)).toBeInTheDocument()
    expect(screen.getByTestId('own-look-preview')).toHaveTextContent('Lukas')
  })

  test('picks the pink heart and a color, kept apart from the partner look', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage(OWN_LOOK_PATH, { partnerLooks: { u2: { nickname: 'Schatz' } } })
    await screen.findByRole('radio', { name: 'Initial' })

    // Act
    await user.click(radio('Symbol', 'Pink heart'))
    await user.click(radio('Color', 'Rose'))

    // Assert
    expect(savedOwnLook()).toEqual({ symbol: '🩷', color: '#ff5c8a' })
    const [, patch] = vi.mocked(updateProfile).mock.lastCall ?? []
    expect(patch?.appearance).toMatchObject({ partnerLooks: { u2: { nickname: 'Schatz' } } })
    expect(screen.getByTestId('own-look-preview')).toHaveTextContent('🩷')
  })

  test('the color starts as your accent color and can be any custom color', async () => {
    renderPage(OWN_LOOK_PATH)
    await screen.findByRole('radio', { name: 'Initial' })
    expect(radio('Color', 'Blue')).toHaveAttribute('aria-checked', 'true')

    fireEvent.change(screen.getByLabelText('Custom color'), { target: { value: '#123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this color' }))

    await waitFor(() => expect(savedOwnLook()).toEqual({ color: '#123456' }))
  })

  test('your symbol shows for you under Members', async () => {
    renderPage('/settings', { ownLook: { symbol: '🔥' } })

    const row = await screen.findByRole('button', { name: /Lukas \(you\)/ })
    expect(row).toHaveTextContent('🔥')
  })

  test('reset goes back to your initial', async () => {
    const user = userEvent.setup()
    renderPage(OWN_LOOK_PATH, { ownLook: { symbol: '🔥', color: '#123456' } })

    await user.click(await screen.findByRole('button', { name: 'Reset to your initial' }))

    const [, patch] = vi.mocked(updateProfile).mock.lastCall ?? []
    expect(patch?.appearance).not.toHaveProperty('ownLook')
  })
})
