import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { toUserMessage } from '../../lib/errors'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import { useDeviceState, useSendTest, useSwitchDevice } from './hooks'
import { NotificationKinds } from './NotificationKinds'
import { PermissionRefusedError } from './pushDevice'
import { browserPushEnvironment, pushAvailability } from './pushSupport'
import { testResultText } from './testResult'

export const NOTIFICATIONS_PATH = '/settings/notifications'

const INSTALL_FIRST =
  'Notifications only reach CALculator when it is opened from the Home Screen: in Safari, tap Share › Add to Home Screen, then open it from there.'
const UNSUPPORTED =
  'This browser can’t show notifications from CALculator. On iPhone they need iOS 16.4 or later.'
const BLOCKED =
  'Notifications are turned off for CALculator in the phone’s settings. Allow them under Settings › Notifications › CALculator, then come back.'
const REFUSED =
  'Notifications weren’t allowed. If no question appeared, allow them under Settings › Notifications › CALculator.'

/** Settings › Notifications: notifications on this phone, and a test. */
export function NotificationsPage() {
  const availability = pushAvailability(browserPushEnvironment())
  return (
    <AppearanceSubPage
      title="Notifications"
      back={{ path: '/settings', label: 'Settings' }}
      saveError={null}
    >
      {availability === 'available' ? (
        <ThisPhone />
      ) : (
        <p className="mt-4 text-[15px] text-label-secondary">
          {availability === 'installFirst' ? INSTALL_FIRST : UNSUPPORTED}
        </p>
      )}
    </AppearanceSubPage>
  )
}

function ThisPhone() {
  const state = useDeviceState(true)
  const switchDevice = useSwitchDevice()
  const sendTest = useSendTest()
  const [message, setMessage] = useState<string | null>(null)
  const isOn = state.data === 'on'

  const switchError =
    switchDevice.error instanceof PermissionRefusedError
      ? REFUSED
      : switchDevice.error && toUserMessage(switchDevice.error)

  if (state.isError) return <ErrorBanner message={toUserMessage(state.error)} />
  if (state.isPending) {
    return <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
  }
  if (state.data === 'blocked')
    return <p className="mt-4 text-[15px] text-label-secondary">{BLOCKED}</p>

  return (
    <>
      <GroupedSection
        header="This phone"
        footer="What you're notified about is saved to your account, for all your phones."
      >
        <ToggleRow
          label="Notifications"
          checked={switchDevice.isPending ? switchDevice.variables : isOn}
          onChange={(on) => {
            setMessage(null)
            sendTest.reset()
            switchDevice.mutate(on)
          }}
        />
      </GroupedSection>
      {switchError && <ErrorBanner message={switchError} />}
      {isOn && (
        <div className="mt-6">
          <Button
            variant="secondary"
            loading={sendTest.isPending}
            onClick={() =>
              sendTest.mutate(undefined, {
                onSuccess: (result) => setMessage(testResultText(result)),
              })
            }
          >
            Send test notification
          </Button>
        </div>
      )}
      {sendTest.error && <ErrorBanner message={toUserMessage(sendTest.error)} />}
      {message && (
        <p role="status" className="mt-3 text-center text-[15px] text-label-secondary">
          {message}
        </p>
      )}
      <NotificationKinds />
    </>
  )
}
