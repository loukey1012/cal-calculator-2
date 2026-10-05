import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))

import { updateProfile } from '../household/householdApi'
import { SettingsPage } from '../settings/SettingsPage'
import { DEFAULT_APPEARANCE } from './appearance'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}

function renderPage(appearance: Record<string, string> = {}) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: { ...ME, appearance }, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route: '/settings/appearance' },
  )
}

function radio(group: string, name: string | RegExp) {
  return within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateProfile).mockResolvedValue()
})

describe('AppearancePage', () => {
  test('shows the current choices, defaults for a new account', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByText(/Saved to your account/)).toBeInTheDocument()
    expect(radio('Theme', 'System')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Dark style', /Soft/)).toHaveAttribute('aria-checked', 'true')
    expect(radio('Accent color', 'Blue')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Goal colors', /Vivid/)).toHaveAttribute('aria-checked', 'true')
    expect(radio('Progress style', 'Ring + bars')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Category chips', 'One line')).toHaveAttribute('aria-checked', 'true')
  })

  test.each([
    ['Theme', 'Dark', { theme: 'dark' }],
    ['Dark style', /Bento/, { darkStyle: 'bento' }],
    ['Goal colors', /Pastel/, { goalPalette: 'pastel' }],
    ['Progress style', 'Compact', { progressStyle: 'compact' }],
    ['Progress style', 'Ring + bars', { progressStyle: 'ringBars' }],
    ['Category chips', 'All on screen', { categoryLayout: 'wrap' }],
    ['Category chips', 'Grouped', { categoryLayout: 'grouped' }],
  ] as const)('saves %s to the account, keeping the other choices', async (group, name, change) => {
    const user = userEvent.setup()
    renderPage({ theme: 'light', progressStyle: 'bars' })

    await user.click(radio(group, name))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: { ...DEFAULT_APPEARANCE, theme: 'light', progressStyle: 'bars', ...change },
    })
  })

  test('saves the accent color', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(radio('Accent color', 'Lime'))

    expect(updateProfile).toHaveBeenCalledWith('u1', { accent_color: '#c6f432' })
  })

  test('the preview uses the chosen progress style', () => {
    renderPage({ progressStyle: 'bars' })

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(within(preview).getAllByTestId('bar')).toHaveLength(4)
    expect(within(preview).queryByTestId('ring')).not.toBeInTheDocument()
  })

  test.each([
    ['line', 'overflow-x-auto'],
    ['wrap', 'flex-wrap'],
  ] as const)('the category chips preview shows the %s layout', (categoryLayout, layoutClass) => {
    renderPage({ categoryLayout })

    const preview = screen.getByRole('img', { name: 'Category chips preview' })

    expect(preview.querySelector('[aria-label="Categories"]')).toHaveClass(layoutClass)
  })

  test('the grouped preview shows a broad category opened up', () => {
    renderPage({ categoryLayout: 'grouped' })

    const preview = screen.getByRole('img', { name: 'Category chips preview' })

    expect(preview.querySelector('[aria-expanded="true"]')).not.toBeNull()
  })

  test('explains when saving fails', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new TypeError('Load failed'))
    const user = userEvent.setup()
    renderPage()

    await user.click(radio('Theme', 'Light'))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
  })

  test('goes back to Settings', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })
})
