import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('./pushDevice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pushDevice')>()),
  deviceState: vi.fn(),
  refreshSubscription: vi.fn(),
  turnOn: vi.fn(),
  turnOff: vi.fn(),
  sendTest: vi.fn(),
}))
vi.mock('./pushSupport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pushSupport')>()),
  browserPushEnvironment: vi.fn(),
}))
vi.mock('./preferencesApi', () => ({
  fetchPreferences: vi.fn(),
  savePreferences: vi.fn(),
  deviceTimeZone: vi.fn(),
}))

import { CurrentUserContext } from '../../app/currentUser'
import { DEFAULT_SETTINGS } from '../../../supabase/functions/_shared/notificationSettings.ts'
import { deviceTimeZone, fetchPreferences, savePreferences } from './preferencesApi'
import {
  deviceState,
  PermissionRefusedError,
  refreshSubscription,
  sendTest,
  turnOff,
  turnOn,
} from './pushDevice'
import { browserPushEnvironment, type PushEnvironment } from './pushSupport'
import { NotificationsPage } from './NotificationsPage'
import { testResultText } from './testResult'

const INSTALLED: PushEnvironment = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isStandalone: true,
  isIos: true,
}

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
      <NotificationsPage />
    </CurrentUserContext>,
    { route: '/settings/notifications' },
  )
}

function lastSaved() {
  const call = vi.mocked(savePreferences).mock.calls.at(-1)
  if (!call) throw new Error('savePreferences was not called')
  return call[1]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(browserPushEnvironment).mockReturnValue(INSTALLED)
  vi.mocked(deviceState).mockResolvedValue('off')
  vi.mocked(refreshSubscription).mockResolvedValue()
  vi.mocked(turnOn).mockResolvedValue()
  vi.mocked(turnOff).mockResolvedValue()
  vi.mocked(fetchPreferences).mockResolvedValue({
    settings: DEFAULT_SETTINGS,
    timeZone: 'Europe/Vienna',
  })
  vi.mocked(savePreferences).mockResolvedValue()
  vi.mocked(deviceTimeZone).mockReturnValue('Europe/Vienna')
})

describe('what to be notified about', () => {
  test('opens with settings an older version kept on the phone (no weekly summary yet)', async () => {
    // Arrange: the cached copy from before the weekly summary, never parsed again
    const { weekly: _missing, ...older } = DEFAULT_SETTINGS
    vi.mocked(fetchPreferences).mockResolvedValue({
      settings: older as typeof DEFAULT_SETTINGS,
      timeZone: 'Europe/Vienna',
    })

    // Act
    renderPage()

    // Assert: the page shows, the weekly summary with its default
    expect(await screen.findByRole('switch', { name: 'Weekly summary' })).toBeChecked()
    expect(screen.getByLabelText('Weekly summary time')).toHaveValue('08:00')
  })

  test('a meal reminder is switched off and saved to my account', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()

    // Act
    await user.click(await screen.findByRole('switch', { name: 'Lunch' }))

    // Assert
    expect(lastSaved().settings.reminders.lunch).toEqual({ on: false, time: '14:00' })
    expect(screen.queryByLabelText('Lunch time')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Dinner time')).toHaveValue('20:00')
  })

  test('a reminder gets a new time', async () => {
    renderPage()

    const time = await screen.findByLabelText('Breakfast time')
    fireEvent.change(time, { target: { value: '09:15' } })

    await vi.waitFor(() =>
      expect(lastSaved().settings.reminders.breakfast).toEqual({ on: true, time: '09:15' }),
    )
  })

  test('the summary can be about the same day', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('radio', { name: 'Same day' }))

    expect(lastSaved().settings.summary).toEqual({
      ...DEFAULT_SETTINGS.summary,
      day: 'same',
    })
    expect(screen.getByText('About the same day, at the time you choose.')).toBeVisible()
  })

  test('the weekly summary is on at 08:00 and gets another time', async () => {
    renderPage()

    const time = await screen.findByLabelText('Weekly summary time')
    expect(time).toHaveValue('08:00')
    expect(screen.getByText(/Every Monday, about last week/)).toBeVisible()
    fireEvent.change(time, { target: { value: '09:30' } })

    await vi.waitFor(() =>
      expect(lastSaved().settings.weekly).toEqual({ ...DEFAULT_SETTINGS.weekly, time: '09:30' }),
    )
  })

  test('the weekly summary can be switched off', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Weekly summary' }))

    expect(lastSaved().settings.weekly).toEqual({ ...DEFAULT_SETTINGS.weekly, on: false })
    expect(screen.queryByLabelText('Weekly summary time')).not.toBeInTheDocument()
  })

  test('the unsaved dish waits an hour instead; the weekly review is switched off', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()

    // Act
    await user.click(await screen.findByRole('radio', { name: '1 h' }))
    await user.click(screen.getByRole('switch', { name: 'Weekly review found something' }))

    // Assert
    await vi.waitFor(() =>
      expect(lastSaved().settings).toMatchObject({
        unsavedDish: { on: true, afterMinutes: 60 },
        weeklyReview: false,
      }),
    )
  })

  test('the partner section explains what is told and that flags are never named', async () => {
    renderPage()

    expect(
      await screen.findByText(
        'Meals, flags and notes your partner changes on any of your days, in one notification once they stop for a few minutes. Which flag it was is never said.',
      ),
    ).toBeInTheDocument()
  })

  test('partner changes can be switched off', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Changes to your days' }))

    expect(lastSaved().settings.partnerChanges).toBe(false)
  })

  test('the phone’s time zone is saved when it changed', async () => {
    vi.mocked(deviceTimeZone).mockReturnValue('America/New_York')

    renderPage()

    await vi.waitFor(() => expect(lastSaved().timeZone).toBe('America/New_York'))
    expect(savePreferences).toHaveBeenCalledTimes(1)
  })

  test('the same time zone is not saved again', async () => {
    renderPage()

    await screen.findByRole('switch', { name: 'Lunch' })

    expect(savePreferences).not.toHaveBeenCalled()
  })
})

describe('NotificationsPage', () => {
  test('turning notifications on asks the phone and shows the test button', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()
    const toggle = await screen.findByRole('switch', { name: 'Notifications' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    vi.mocked(deviceState).mockResolvedValue('on')

    // Act
    await user.click(toggle)

    // Assert
    expect(turnOn).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Send test notification' })).toBeVisible()
    expect(screen.getByRole('switch', { name: 'Notifications' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('an open phone with notifications keeps its subscription up to date', async () => {
    vi.mocked(deviceState).mockResolvedValue('on')

    renderPage()

    expect(await screen.findByRole('button', { name: 'Send test notification' })).toBeVisible()
    expect(refreshSubscription).toHaveBeenCalled()
  })

  test('the test says how many phones it reached', async () => {
    const user = userEvent.setup()
    vi.mocked(deviceState).mockResolvedValue('on')
    vi.mocked(sendTest).mockResolvedValue({ sent: 1, removed: 0, failed: 0 })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Send test notification' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Sent to 1 phone.')
  })

  test('turning them off forgets this phone', async () => {
    const user = userEvent.setup()
    vi.mocked(deviceState).mockResolvedValue('on')
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Notifications' }))

    expect(turnOff).toHaveBeenCalled()
  })

  test('a refused permission says where to allow it', async () => {
    const user = userEvent.setup()
    vi.mocked(turnOn).mockRejectedValue(new PermissionRefusedError())
    renderPage()

    await user.click(await screen.findByRole('switch', { name: 'Notifications' }))

    expect(await screen.findByText(/Notifications weren’t allowed/)).toBeVisible()
  })

  test('blocked in the phone’s settings: says where to allow them', async () => {
    vi.mocked(deviceState).mockResolvedValue('blocked')

    renderPage()

    expect(await screen.findByText(/turned off for CALculator/)).toBeVisible()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  test('in a Safari tab: add it to the Home Screen first', () => {
    vi.mocked(browserPushEnvironment).mockReturnValue({ ...INSTALLED, isStandalone: false })

    renderPage()

    expect(screen.getByText(/Add to Home Screen/)).toBeVisible()
    expect(deviceState).not.toHaveBeenCalled()
  })

  test('without push support it says so', () => {
    vi.mocked(browserPushEnvironment).mockReturnValue({ ...INSTALLED, hasPushManager: false })

    renderPage()

    expect(screen.getByText(/iOS 16.4 or later/)).toBeVisible()
  })
})

describe('testResultText', () => {
  test.each([
    [{ sent: 0, removed: 0, failed: 0 }, 'No phone of yours has notifications on.'],
    [{ sent: 2, removed: 1, failed: 0 }, 'Sent to 2 phones.'],
    [{ sent: 1, removed: 0, failed: 1 }, 'Sent to 1 phone. 1 phone couldn’t be reached.'],
  ])('%o', (result, text) => {
    expect(testResultText(result)).toBe(text)
  })
})

describe('Day summary contents', () => {
  function Where() {
    return <p data-testid="where">{useLocation().pathname}</p>
  }

  test('a Contents row tells how many parts are shown and opens the page', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
        <NotificationsPage />
        <Where />
      </CurrentUserContext>,
      { route: '/settings/notifications' },
    )

    await user.click(await screen.findByRole('button', { name: 'Day summary contents' }))

    expect(screen.getByText('4 shown')).toBeVisible()
    expect(screen.getByTestId('where')).toHaveTextContent('/settings/notifications/day-summary')
  })

  test('the weekly summary has its own Contents row with its count', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
        <NotificationsPage />
        <Where />
      </CurrentUserContext>,
      { route: '/settings/notifications' },
    )

    const row = await screen.findByRole('button', { name: 'Weekly summary contents' })
    expect(row).toHaveTextContent('3 shown')
    await user.click(row)

    expect(screen.getByTestId('where')).toHaveTextContent('/settings/notifications/weekly-summary')
  })

  test('no Contents row while the weekly summary is off', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('switch', { name: 'Weekly summary' }))

    expect(screen.queryByRole('button', { name: 'Weekly summary contents' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Day summary contents' })).toBeVisible()
  })

  test('no Contents row while the day summary is off', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('switch', { name: 'Day summary' }))

    expect(screen.queryByRole('button', { name: 'Day summary contents' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Weekly summary contents' })).toHaveTextContent(
      '3 shown',
    )
  })
})
