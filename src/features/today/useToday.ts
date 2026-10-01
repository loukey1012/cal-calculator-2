import { useEffect, useState } from 'react'
import { msUntilNextMidnight, toLocalDateString } from '../../lib/dates'

// fire just after midnight so the new day is definitely reached
const MIDNIGHT_GRACE_MS = 1000

/**
 * Today's local date (YYYY-MM-DD). Moves on at midnight, and re-checks when the PWA returns
 * to the foreground, since iOS doesn't run timers in suspended apps.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toLocalDateString(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      setToday(toLocalDateString(new Date()))
      clearTimeout(timer)
      timer = setTimeout(refresh, msUntilNextMidnight(new Date()) + MIDNIGHT_GRACE_MS)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return today
}
