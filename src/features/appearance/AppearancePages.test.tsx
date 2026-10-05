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

const MENU = '/settings/appearance'
const COLORS = '/settings/appearance/colors'
const PROGRESS = '/settings/appearance/progress'
const CHIPS = '/settings/appearance/category-chips'

function renderPage(route: string, appearance: Record<string, string> = {}) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: { ...ME, appearance }, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route },
  )
}

function radio(group: string, name: string | RegExp) {
  return within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name })
}

function heading(name: string) {
  return screen.getByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateProfile).mockResolvedValue()
})

describe('Appearance menu', () => {
  test('lists the three pages, each summarising its current choices', () => {
    renderPage(MENU, { theme: 'dark', darkStyle: 'bento', goalPalette: 'pastel' })

    expect(heading('Appearance')).toBeInTheDocument()
    expect(screen.getByText(/Saved to your account/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /App colors/ })).toHaveTextContent('Dark · Graphite')
    expect(screen.getByRole('button', { name: /Progress/ })).toHaveTextContent(
      'Ring + bars · Pastel',
    )
    expect(screen.getByRole('button', { name: /Category chips/ })).toHaveTextContent('One line')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  test.each([
    ['App colors', 'App colors', 'Theme'],
    ['Progress', 'Progress', 'Progress style'],
    ['Category chips', 'Category chips', 'Category chips'],
  ])('opens %s', async (row, title, group) => {
    const user = userEvent.setup()
    renderPage(MENU)

    await user.click(screen.getByRole('button', { name: new RegExp(row) }))

    expect(heading(title)).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: group })).toBeInTheDocument()
  })

  test('an unknown appearance page shows the menu', () => {
    renderPage('/settings/appearance/nope')

    expect(heading('Appearance')).toBeInTheDocument()
  })

  test('goes back to Settings', async () => {
    const user = userEvent.setup()
    renderPage(MENU)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(heading('Settings')).toBeInTheDocument()
  })
})

describe('Appearance pages', () => {
  test('show the current choices, defaults for a new account', () => {
    renderPage(COLORS)
    expect(radio('Theme', 'System')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Dark style', /Soft/)).toHaveAttribute('aria-checked', 'true')
    expect(radio('Accent color', 'Blue')).toHaveAttribute('aria-checked', 'true')
  })

  test('the progress page shows its defaults', () => {
    renderPage(PROGRESS)
    expect(radio('Progress style', 'Ring + bars')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Goal colors', /Vivid/)).toHaveAttribute('aria-checked', 'true')
  })

  test('the category chips page shows its default', () => {
    renderPage(CHIPS)
    expect(radio('Category chips', 'One line')).toHaveAttribute('aria-checked', 'true')
  })

  test('the dark style formerly called Bento is named Graphite', () => {
    renderPage(COLORS, { darkStyle: 'bento' })

    expect(radio('Dark style', /Graphite/)).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/Bento/)).not.toBeInTheDocument()
  })

  test.each([
    [COLORS, 'Theme', 'Dark', { theme: 'dark' }],
    [COLORS, 'Dark style', /Graphite/, { darkStyle: 'bento' }],
    [PROGRESS, 'Goal colors', /Pastel/, { goalPalette: 'pastel' }],
    [PROGRESS, 'Progress style', 'Compact', { progressStyle: 'compact' }],
    [PROGRESS, 'Progress style', 'Ring + bars', { progressStyle: 'ringBars' }],
    [CHIPS, 'Category chips', 'All on screen', { categoryLayout: 'wrap' }],
    [CHIPS, 'Category chips', 'Grouped', { categoryLayout: 'grouped' }],
  ] as const)(
    '%s saves %s to the account, keeping the other choices',
    async (route, group, name, change) => {
      const user = userEvent.setup()
      renderPage(route, { theme: 'light', progressStyle: 'bars' })

      await user.click(radio(group, name))

      expect(updateProfile).toHaveBeenCalledWith('u1', {
        appearance: { ...DEFAULT_APPEARANCE, theme: 'light', progressStyle: 'bars', ...change },
      })
    },
  )

  test('saves the accent color', async () => {
    const user = userEvent.setup()
    renderPage(COLORS)

    await user.click(radio('Accent color', 'Lime'))

    expect(updateProfile).toHaveBeenCalledWith('u1', { accent_color: '#c6f432' })
  })

  test('the progress preview uses the chosen progress style', () => {
    renderPage(PROGRESS, { progressStyle: 'bars' })

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(within(preview).getAllByTestId('bar')).toHaveLength(4)
    expect(within(preview).queryByTestId('ring')).not.toBeInTheDocument()
  })

  test.each([
    ['line', 'overflow-x-auto'],
    ['wrap', 'flex-wrap'],
  ] as const)('the category chips preview shows the %s layout', (categoryLayout, layoutClass) => {
    renderPage(CHIPS, { categoryLayout })

    const preview = screen.getByRole('img', { name: 'Category chips preview' })

    expect(preview.querySelector('[aria-label="Categories"]')).toHaveClass(layoutClass)
  })

  test('the grouped preview shows a broad category opened up', () => {
    renderPage(CHIPS, { categoryLayout: 'grouped' })

    const preview = screen.getByRole('img', { name: 'Category chips preview' })

    expect(preview.querySelector('[aria-expanded="true"]')).not.toBeNull()
  })

  test('explains when saving fails', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new TypeError('Load failed'))
    const user = userEvent.setup()
    renderPage(COLORS)

    await user.click(radio('Theme', 'Light'))

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
  })

  test.each([COLORS, PROGRESS, CHIPS])('%s goes back to the Appearance menu', async (route) => {
    const user = userEvent.setup()
    renderPage(route)

    await user.click(screen.getByRole('button', { name: 'Appearance' }))

    expect(heading('Appearance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /App colors/ })).toBeInTheDocument()
  })
})
