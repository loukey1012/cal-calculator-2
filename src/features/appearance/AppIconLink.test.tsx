import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
  updateProfile: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))

import { SettingsPage } from '../settings/SettingsPage'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: { appIcon: 'leaf' },
  created_at: '',
  updated_at: '',
}

function renderIconPage() {
  renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route: '/settings/appearance/app-icon' },
  )
}

function icon(name: string) {
  return within(screen.getByRole('radiogroup', { name: 'App icon' })).getByRole('radio', { name })
}

const writeText = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
  vi.clearAllMocks()
  writeText.mockResolvedValue()
})

describe('changing the app icon', () => {
  test('copies the app link and says so', async () => {
    // Arrange
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderIconPage()

    // Act
    await user.click(icon('Sunset'))

    // Assert
    expect(writeText).toHaveBeenCalledWith(window.location.origin)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Link copied. Paste it in Safari to add CALculator again.',
    )
  })

  test('picking the icon already chosen copies nothing', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderIconPage()

    await user.click(icon('Leaf'))

    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('when copying fails, the link is shown instead', async () => {
    const user = userEvent.setup()
    writeText.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderIconPage()

    await user.click(icon('Sunset'))

    expect(await screen.findByRole('status')).toHaveTextContent(
      `Couldn’t copy the link: ${window.location.host}`,
    )
  })

  test('the footer explains the copied link', () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderIconPage()

    expect(screen.getByText(/the link is copied for you/i)).toBeInTheDocument()
  })
})
