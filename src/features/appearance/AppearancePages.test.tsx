import { fireEvent, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import type { Json } from '../../lib/database.types'
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
  kcal_burned: null,
  appearance: {},
  created_at: '',
  updated_at: '',
}

const MENU = '/settings/appearance'
const COLORS = '/settings/appearance/colors'
const PROGRESS = '/settings/appearance/progress'
const CHIPS = '/settings/appearance/category-chips'
const ICON = '/settings/appearance/app-icon'

function renderPage(route: string, appearance: { [key: string]: Json } = {}) {
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
  test('the Progress summary says Custom while custom ring colors are on', () => {
    renderPage(MENU, { goalPalette: 'pastel', customGoalColors: { fat: '#9466d6' } })

    expect(screen.getByRole('button', { name: /Progress/ })).toHaveTextContent(
      'Ring + bars · Custom',
    )
  })

  test('the Progress summary says Custom with the flag on, and not with it off', () => {
    const colors = { goalPalette: 'pastel', customGoalColors: { fat: '#9466d6' } } as const
    const { unmount } = renderPage(MENU, { ...colors, customGoalColorsOn: true })
    expect(screen.getByRole('button', { name: /Progress/ })).toHaveTextContent(
      'Ring + bars · Custom',
    )
    unmount()

    renderPage(MENU, { ...colors, customGoalColorsOn: false })
    expect(screen.getByRole('button', { name: /Progress/ })).not.toHaveTextContent('Custom')
  })

  test('lists the four pages, each summarising its current choices', () => {
    renderPage(MENU, { theme: 'dark', darkStyle: 'bento', goalPalette: 'pastel' })

    expect(heading('Appearance')).toBeInTheDocument()
    expect(screen.getByText(/Saved to your account/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /App colors/ })).toHaveTextContent('Dark · Graphite')
    expect(screen.getByRole('button', { name: /Progress/ })).toHaveTextContent(
      'Ring + bars · Pastel',
    )
    expect(screen.getByRole('button', { name: /Category chips/ })).toHaveTextContent('One line')
    expect(screen.getByRole('button', { name: /App icon/ })).toHaveTextContent('Graphite')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  test.each([
    ['App colors', 'App colors', 'Theme'],
    ['Progress', 'Progress', 'Progress style'],
    ['Category chips', 'Category chips', 'Category chips'],
    ['App icon', 'App icon', 'App icon'],
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
    expect(radio('Liquid Glass', 'Off')).toHaveAttribute('aria-checked', 'true')
  })

  test('the progress page shows its defaults', () => {
    renderPage(PROGRESS)
    expect(radio('Progress style', 'Ring + bars')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Goal colors', /Vivid/)).toHaveAttribute('aria-checked', 'true')
  })

  test('the app icon page offers eight icons, Graphite chosen for a new account', () => {
    renderPage(ICON)

    expect(
      within(screen.getByRole('radiogroup', { name: 'App icon' })).getAllByRole('radio'),
    ).toHaveLength(8)
    expect(radio('App icon', 'Graphite')).toHaveAttribute('aria-checked', 'true')
  })

  test('the app icon page shows the chosen icon and how to get it on the home screen', () => {
    renderPage(ICON, { appIcon: 'leaf' })

    expect(radio('App icon', 'Leaf')).toHaveAttribute('aria-checked', 'true')
    expect(radio('App icon', 'Leaf').querySelector('img')).toHaveAttribute(
      'src',
      '/icons/leaf/icon.svg',
    )
    expect(screen.getByText(/remove CALculator from your home screen/i)).toBeInTheDocument()
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
    [COLORS, 'Liquid Glass', 'Minimal', { glass: 'controls' }],
    [COLORS, 'Liquid Glass', 'Full', { glass: 'all' }],
    [PROGRESS, 'Goal colors', /Pastel/, { goalPalette: 'pastel' }],
    [PROGRESS, 'Progress style', 'Compact', { progressStyle: 'compact' }],
    [PROGRESS, 'Progress style', 'Ring + bars', { progressStyle: 'ringBars' }],
    [CHIPS, 'Category chips', 'All on screen', { categoryLayout: 'wrap' }],
    [CHIPS, 'Category chips', 'Grouped', { categoryLayout: 'grouped' }],
    [ICON, 'App icon', 'Sunset', { appIcon: 'sunset' }],
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

  test('the accent color can be White or any custom color', async () => {
    const user = userEvent.setup()
    renderPage(COLORS)

    await user.click(radio('Accent color', 'White'))
    expect(updateProfile).toHaveBeenLastCalledWith('u1', { accent_color: '#ffffff' })
    fireEvent.change(screen.getByLabelText('Custom color'), { target: { value: '#123456' } })
    await user.click(screen.getByRole('button', { name: 'Use this color' }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenLastCalledWith('u1', { accent_color: '#123456' }),
    )
  })

  test('the progress preview uses the chosen progress style', () => {
    renderPage(PROGRESS, { progressStyle: 'bars' })

    const preview = screen.getByRole('region', { name: 'Preview' })
    // calories and the four macros, fiber included
    expect(within(preview).getAllByTestId('bar')).toHaveLength(5)
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
    expect(ringColorRow('Fiber')).toHaveTextContent('Palette')
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
        customGoalColorsOn: true,
      },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('any color can be chosen with the color picker', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS)

    await user.click(ringColorRow('Calories'))
    const sheet = screen.getByRole('dialog', { name: 'Calories color' })
    fireEvent.change(within(sheet).getByLabelText('Custom color'), {
      target: { value: '#123456' },
    })
    await user.click(within(sheet).getByRole('button', { name: 'Use this color' }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith('u1', {
        appearance: {
          ...DEFAULT_APPEARANCE,
          customGoalColors: { kcal: '#123456' },
          customGoalColorsOn: true,
        },
      }),
    )
  })

  test('a goal can go back to its palette color', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456', fat: '#9466d6' } })

    await user.click(ringColorRow('Protein'))
    await user.click(screen.getByRole('button', { name: 'Use palette color' }))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        customGoalColors: { fat: '#9466d6' },
        customGoalColorsOn: true,
      },
    })
  })

  test('without custom colors there is no Custom card', () => {
    renderPage(PROGRESS)

    expect(
      within(screen.getByRole('radiogroup', { name: 'Goal colors' })).queryByRole('radio', {
        name: /Custom/,
      }),
    ).not.toBeInTheDocument()
  })

  test('colors saved before the flag existed show as Custom', () => {
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456' } })

    expect(radio('Goal colors', /Custom/)).toHaveAttribute('aria-checked', 'true')
    expect(radio('Goal colors', /Vivid/)).toHaveAttribute('aria-checked', 'false')
  })

  test('choosing a palette keeps the custom colors stored, switched off', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456' } })

    await user.click(radio('Goal colors', /Pastel/))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        goalPalette: 'pastel',
        customGoalColors: { protein: '#123456' },
        customGoalColorsOn: false,
      },
    })
  })

  test('with a palette picked the rings show the palette and Custom is offered', () => {
    renderPage(PROGRESS, {
      customGoalColors: { protein: '#123456' },
      customGoalColorsOn: false,
    })

    expect(radio('Goal colors', /Custom/)).toHaveAttribute('aria-checked', 'false')
    expect(radio('Goal colors', /Vivid/)).toHaveAttribute('aria-checked', 'true')
    expect(ringColorRow('Protein')).toHaveTextContent('Palette')
  })

  test('the Custom card previews the stored colors, not the palette', () => {
    renderPage(PROGRESS, {
      goalPalette: 'pastel',
      customGoalColors: { protein: '#123456' },
      customGoalColorsOn: false,
    })

    const dots = Array.from(radio('Goal colors', /Custom/).querySelectorAll('span[style]'))
    expect(dots.map((dot) => (dot as HTMLElement).style.backgroundColor)).toContain(
      'rgb(18, 52, 86)',
    )
  })

  test('explains that ring edits switch to Custom', () => {
    renderPage(PROGRESS)

    expect(
      screen.getByText('Your own colors are kept under Custom; changing a ring switches to it.', {
        exact: false,
      }),
    ).toBeInTheDocument()
  })

  test('palette chosen, colors stored: editing a ring gives Custom the old colors plus the change', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, {
      goalPalette: 'pastel',
      customGoalColors: { fat: '#9466d6', fiber: '#123456' },
      customGoalColorsOn: false,
    })

    await user.click(ringColorRow('Protein'))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Protein color' })).getByRole('radio', {
        name: 'Mint',
      }),
    )

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        goalPalette: 'pastel',
        customGoalColors: { fat: '#9466d6', fiber: '#123456', protein: '#2fa889' },
        customGoalColorsOn: true,
      },
    })
  })

  test('choosing Custom brings the stored colors back', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, {
      goalPalette: 'pastel',
      customGoalColors: { protein: '#123456' },
      customGoalColorsOn: false,
    })

    await user.click(radio('Goal colors', /Custom/))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        goalPalette: 'pastel',
        customGoalColors: { protein: '#123456' },
        customGoalColorsOn: true,
      },
    })
  })

  test('editing a ring while a palette is picked selects Custom, keeping the stored colors', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, {
      customGoalColors: { fat: '#9466d6' },
      customGoalColorsOn: false,
    })

    await user.click(ringColorRow('Protein'))
    const sheet = screen.getByRole('dialog', { name: 'Protein color' })
    await user.click(within(sheet).getByRole('radio', { name: 'Mint' }))

    expect(updateProfile).toHaveBeenCalledWith('u1', {
      appearance: {
        ...DEFAULT_APPEARANCE,
        customGoalColors: { fat: '#9466d6', protein: '#2fa889' },
        customGoalColorsOn: true,
      },
    })
  })

  test('removing the last custom color drops the colors and the flag', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { customGoalColors: { protein: '#123456' } })

    await user.click(ringColorRow('Protein'))
    await user.click(screen.getByRole('button', { name: 'Use palette color' }))

    const saved = vi.mocked(updateProfile).mock.calls[0]?.[1]
    expect(saved).toEqual({ appearance: DEFAULT_APPEARANCE })
    expect(saved?.appearance).not.toHaveProperty('customGoalColors')
    expect(saved?.appearance).not.toHaveProperty('customGoalColorsOn')
  })
})

describe('When over', () => {
  test('starts with the Signal colors', () => {
    renderPage(PROGRESS)

    expect(radio('When over', /Signal/)).toHaveAttribute('aria-checked', 'true')
  })

  test('a preset or Off is saved, keeping the other choices', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { goalPalette: 'pastel' })

    await user.click(radio('When over', /Neon/))
    expect(updateProfile).toHaveBeenLastCalledWith('u1', {
      appearance: expect.objectContaining({
        goalPalette: 'pastel',
        overColors: expect.objectContaining({ mode: 'neon' }),
      }),
    })

    await user.click(radio('When over', /Off/))
    expect(updateProfile).toHaveBeenLastCalledWith('u1', {
      appearance: expect.objectContaining({ overColors: expect.objectContaining({ mode: 'off' }) }),
    })
  })

  test('custom: a color for more than 10 % over and one for more than 300 kcal over', async () => {
    const user = userEvent.setup()
    renderPage(PROGRESS, { overColors: { mode: 'custom' } })

    await user.click(screen.getByRole('button', { name: /More than 300 kcal over/ }))
    const sheet = screen.getByRole('dialog', { name: 'More than 300 kcal over' })
    await user.click(within(sheet).getByRole('radio', { name: 'Violet' }))

    expect(updateProfile).toHaveBeenLastCalledWith('u1', {
      appearance: expect.objectContaining({
        overColors: expect.objectContaining({ mode: 'custom', well: '#8e4ec6' }),
      }),
    })
    expect(screen.getByRole('button', { name: /More than 10 % over/ })).toBeInTheDocument()
  })

  test('the preview shows rings that are over, too', () => {
    renderPage(PROGRESS)

    expect(screen.getByRole('region', { name: 'Preview when over' })).toBeInTheDocument()
  })
})
