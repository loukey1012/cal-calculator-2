import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./preferencesApi', () => ({
  fetchPreferences: vi.fn(),
  savePreferences: vi.fn(),
  deviceTimeZone: vi.fn(),
}))

import { CurrentUserContext } from '../../app/currentUser'
import { DEFAULT_SETTINGS } from '../../../supabase/functions/_shared/notificationSettings.ts'
import { DaySummaryPage } from './DaySummaryPage'
import { deviceTimeZone, fetchPreferences, savePreferences } from './preferencesApi'

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

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <DaySummaryPage />
    </CurrentUserContext>,
    { route: '/settings/notifications/day-summary' },
  )
}

function lastSaved() {
  const call = vi.mocked(savePreferences).mock.calls.at(-1)
  if (!call) throw new Error('savePreferences was not called')
  return call[1]
}

const partOrder = () =>
  screen.getAllByRole('listitem').map((row) => row.firstElementChild?.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchPreferences).mockResolvedValue({
    settings: DEFAULT_SETTINGS,
    timeZone: 'Europe/Vienna',
  })
  vi.mocked(savePreferences).mockResolvedValue()
  vi.mocked(deviceTimeZone).mockReturnValue('Europe/Vienna')
})

describe('Day summary page', () => {
  test('shows the title, a way back and every part in the saved order', async () => {
    renderPage()

    expect(await screen.findByRole('switch', { name: 'Protein' })).toBeChecked()
    expect(screen.getByRole('heading', { name: 'Day summary' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeVisible()
    expect(partOrder()).toEqual([
      'Cheat or alcohol day',
      'Protein',
      'Carbs',
      'Fat',
      'Calories left or over',
      'Fiber',
      'Sugar',
      'Salt',
      'Missing meals',
      'Week so far: Ø calories',
      'Week so far: calories saved',
    ])
    expect(screen.getByRole('switch', { name: 'Protein' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Fiber' })).not.toBeChecked()
  })

  test('previews the notification of an example day', async () => {
    renderPage()

    const preview = await screen.findByRole('group', { name: 'Notification preview' })
    expect(within(preview).getByText('Yesterday: 1850 of 2000 kcal')).toBeVisible()
    expect(
      within(preview).getByText('Protein 121 of 140 g · Carbs 200 of 220 g · Fat 62 of 70 g'),
    ).toBeVisible()
    expect(screen.getByText('Example day')).toBeVisible()
  })

  test('switching a part saves it at once and changes the preview', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Calories left or over' }))

    const { parts } = lastSaved().settings.summary
    expect(parts.find((part) => part.id === 'calories')).toEqual({ id: 'calories', on: true })
    expect(parts.map((part) => part.id)).toEqual(DEFAULT_SETTINGS.summary.parts.map((p) => p.id))
    expect(screen.getByText(/150 kcal left/)).toBeVisible()
  })

  test('moving a part saves the new order and reorders the preview', async () => {
    const user = userEvent.setup()
    renderPage()

    ;(await screen.findByRole('button', { name: 'Move Fat' })).focus()
    await user.keyboard('{ArrowUp}{ArrowUp}')

    expect(
      lastSaved()
        .settings.summary.parts.slice(1, 4)
        .map((part) => part.id),
    ).toEqual(['fat', 'protein', 'carbs'])
    expect(screen.getByText(/Fat 62 of 70 g · Protein 121 of 140 g/)).toBeVisible()
  })

  test('"Only nutrients with a goal" is saved', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Only nutrients with a goal' }))

    expect(lastSaved().settings.summary.onlyWithGoal).toBe(true)
    expect(lastSaved().timeZone).toBe('Europe/Vienna')
    expect(screen.getByText(/Sugar and salt have no goal/)).toBeVisible()
  })

  test('shows only the title when no part is on', async () => {
    vi.mocked(fetchPreferences).mockResolvedValue({
      settings: {
        ...DEFAULT_SETTINGS,
        summary: {
          ...DEFAULT_SETTINGS.summary,
          parts: DEFAULT_SETTINGS.summary.parts.map((part) => ({ ...part, on: false })),
        },
      },
      timeZone: 'Europe/Vienna',
    })
    renderPage()

    const preview = await screen.findByRole('group', { name: 'Notification preview' })
    expect(within(preview).getByText('Yesterday: 1850 of 2000 kcal')).toBeVisible()
    expect(preview.querySelector('[data-testid="preview-body"]')).toBeNull()
  })

  test('says so when the settings cannot be loaded', async () => {
    vi.mocked(fetchPreferences).mockRejectedValue(new Error('offline'))
    renderPage()

    expect(await screen.findByRole('alert')).toBeVisible()
  })

  test('shows a failed save', async () => {
    vi.mocked(savePreferences).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Fiber' }))

    expect(await screen.findByRole('alert')).toBeVisible()
  })
})
