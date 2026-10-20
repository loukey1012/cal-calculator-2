import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function renderPage() {
  return renderWithProviders(<NotificationsPage />, { route: '/settings/notifications' })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(browserPushEnvironment).mockReturnValue(INSTALLED)
  vi.mocked(deviceState).mockResolvedValue('off')
  vi.mocked(refreshSubscription).mockResolvedValue()
  vi.mocked(turnOn).mockResolvedValue()
  vi.mocked(turnOff).mockResolvedValue()
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
