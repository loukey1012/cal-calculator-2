import { fireEvent, screen, within } from '@testing-library/react'
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

function renderPage(route: string, appearance: Record<string, unknown> = {}) {
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

test.each([
  [{ theme: 'light' }, 'Light · Classic'],
  [{ theme: 'light', lightStyle: 'pink' }, 'Light · Pink'],
  [{ theme: 'dark', lightStyle: 'pink' }, 'Dark · Soft'],
  [{ lightStyle: 'pink', darkStyle: 'bento' }, 'System · Pink / Graphite'],
])('the App colors row summarises %j as %s', (appearance, summary) => {
  renderPage(MENU, appearance)

  expect(screen.getByRole('button', { name: /App colors/ })).toHaveTextContent(summary)
})

describe('Appearance pages', () => {
  test('show the current choices, defaults for a new account', () => {
    renderPage(COLORS)
    expect(radio('Theme', 'System')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Light style', /Classic/)).toHaveAttribute('aria-checked', 'true')
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
    [COLORS, 'Light style', /Pink/, { lightStyle: 'pink' }],
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

describe('Ring colors', () => {
  function ringColorRow(name: string) {
    return within(screen.getByRole('list', { name: 'Ring colors' })).getByRole('button', {
      name: new RegExp(name),
    })
  }

  test('lists every goal, marking the ones with a custom color', () => {
    renderPage(PROGRESS, { customGoalColors: { fat: '#9466d6' } })

    expect(ringColorRow('Calories')).toHaveTextContent('Palette')
    expect(ringColorRow('Protein')).toHaveTextContent('Palette')
    expect(ringColorRow('Carbs')).toHaveTextContent('Palette')
    expect(ringColorRow('Fat')).toHaveTextContent('Custom')
  })

  test('picking a color saves it for that goal only, keeping the other choices', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { goalPalette: 'pastel', customGoalColors: { fat: '#9466d6' } })

    await user.click(ringColorRow('Protein'))
    const sheet = screen.getByRole('dialog', { name: 'Protein color' })
    await user.click(within(sheet).getByRole('radio', { name: 'Mint' }))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        goalPalette: 'pastel',
        customGoalColors: { fat: '#9466d6', protein: '#2fa889' },
      },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('any color can be chosen with the color picker', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS)

    await user.click(ringColorRow('Calories'))
    const sheet = screen.getByRole('dialog', { name: 'Calories color' })
    fireEvent.input(within(sheet).getByLabelText('Custom color'), {
      target: { value: '#123456' },
    })
    await user.click(within(sheet).getByRole('button', { name: 'Use custom color' }))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: { ...DEFAULT_APPEARANCE, customGoalColors: { kcal: '#123456' } },
    })
  })

  test('a goal can go back to its palette color', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456', fat: '#9466d6' } })

    await user.click(ringColorRow('Protein'))
    await user.click(screen.getByRole('button', { name: 'Use palette color' }))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: { ...DEFAULT_APPEARANCE, customGoalColors: { fat: '#9466d6' } },
    })
  })

  test('choosing a palette resets the custom colors', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456' } })

    await user.click(radio('Goal colors', /Pastel/))

    const saved = vi.mocked(updateProfile).mock.calls[0]?.[1]
    expect(saved).toEqual({ appearance: { ...DEFAULT_APPEARANCE, goalPalette: 'pastel' } })
    expect(saved?.appearance).not.toHaveProperty('customGoalColors')
  })
})
