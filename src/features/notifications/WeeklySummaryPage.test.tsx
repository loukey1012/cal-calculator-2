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
import { WeeklySummaryPage } from './WeeklySummaryPage'
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
      <WeeklySummaryPage />
    </CurrentUserContext>,
    { route: '/settings/notifications/weekly-summary' },
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

describe('Weekly summary page', () => {
  test('shows the title, a way back and every part in the saved order', async () => {
    renderPage()

    expect(await screen.findByRole('switch', { name: 'Calories saved' })).toBeChecked()
    expect(screen.getByRole('heading', { name: 'Weekly summary' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeVisible()
    expect(partOrder()).toEqual([
      'Calories saved',
      'Ø calories',
      'Days within goal',
      'Burned and eaten',
      'Ø protein',
      'Ø carbs',
      'Ø fat',
      'Ø fiber',
      'Ø sugar',
      'Ø salt',
      'Days not counted',
    ])
    expect(screen.getByRole('switch', { name: 'Burned and eaten' })).not.toBeChecked()
  })

  test('previews the notification of an example week', async () => {
    renderPage()

    const preview = await screen.findByRole('group', { name: 'Notification preview' })
    expect(within(preview).getByText('Week 43: 2,100 kcal saved')).toBeVisible()
    expect(within(preview).getByText('Ø 1,930 kcal · 5 of 6 days within goal')).toBeVisible()
    expect(screen.getByText('Example week')).toBeVisible()
  })

  test('switching a part saves it at once and changes the preview', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Burned and eaten' }))

    const { weekly } = lastSaved().settings
    expect(weekly.parts.find((part) => part.id === 'burnedEaten')).toEqual({
      id: 'burnedEaten',
      on: true,
    })
    expect(weekly.parts.map((part) => part.id)).toEqual(
      DEFAULT_SETTINGS.weekly.parts.map((part) => part.id),
    )
    expect(screen.getByText(/Burned 13,680 · ate 11,580 kcal/)).toBeVisible()
  })

  test('moving a part saves the new order and reorders the preview', async () => {
    const user = userEvent.setup()
    renderPage()

    ;(await screen.findByRole('button', { name: 'Move Days within goal' })).focus()
    await user.keyboard('{ArrowUp}{ArrowUp}')

    expect(
      lastSaved()
        .settings.weekly.parts.slice(0, 3)
        .map((part) => part.id),
    ).toEqual(['withinGoal', 'saved', 'average'])
    expect(screen.getByText('Week 43: 5 of 6 days within goal')).toBeVisible()
  })

  test('"Only nutrients with a goal" is saved and hides averages without one', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Ø sugar' }))
    expect(screen.getByTestId('preview-body')).toHaveTextContent('Ø sugar 46 g')
    await user.click(screen.getByRole('switch', { name: 'Only nutrients with a goal' }))

    expect(lastSaved().settings.weekly.onlyWithGoal).toBe(true)
    expect(lastSaved().settings.summary).toEqual(DEFAULT_SETTINGS.summary)
    expect(screen.getByTestId('preview-body')).not.toHaveTextContent('Ø sugar')
  })

  test('says so when the settings cannot be loaded', async () => {
    vi.mocked(fetchPreferences).mockRejectedValue(new Error('offline'))
    renderPage()

    expect(await screen.findByRole('alert')).toBeVisible()
  })
})
