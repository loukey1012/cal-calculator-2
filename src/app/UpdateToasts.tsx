import { useCallback, useEffect, useState } from 'react'
import { Toast } from '../components/ios/Toast'
import type { UpdateReady } from './updateReady'

const UPDATED_MESSAGE = 'Updated to the latest version'
const READY_MESSAGE = 'New version ready'
// the offer to update stays longer than a plain message
const READY_DURATION_MS = 8000

type Shown = 'updated' | 'ready' | null

type UpdateToastsProps = {
  /** the first start on a new version */
  readonly updatedThisStart: boolean
  readonly update: UpdateReady
}

/** "Updated to the latest version" once per new version, and "New version ready" while one waits. */
export function UpdateToasts({ updatedThisStart, update }: UpdateToastsProps) {
  const [shown, setShown] = useState<Shown>(() => {
    if (update.isReady()) return 'ready'
    return updatedThisStart ? 'updated' : null
  })
  const hide = useCallback(() => setShown(null), [])

  useEffect(() => update.subscribe(() => setShown('ready')), [update])

  // ignored, the offer comes back the next time the app is opened from the background
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && update.isReady()) setShown('ready')
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [update])

  if (shown === 'ready') {
    return (
      <Toast
        message={READY_MESSAGE}
        action={{ label: 'Update', onPress: update.apply }}
        durationMs={READY_DURATION_MS}
        onDone={hide}
      />
    )
  }
  return <Toast message={shown === 'updated' ? UPDATED_MESSAGE : null} onDone={hide} />
}
