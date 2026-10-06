import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const TOAST_DURATION_MS = 3000

type ToastProps = {
  /** null while nothing is shown */
  readonly message: string | null
  readonly onDone: () => void
}

/**
 * A short message floating above the tab bar that goes away by itself. Rendered into the body,
 * outside the tab carousel (whose transforms would move a fixed element).
 */
export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(onDone, TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [message, onDone])

  if (message === null) return null
  return createPortal(
    <div
      role="status"
      className="animate-toast-in pointer-events-none fixed inset-x-0 z-30 flex justify-center px-6"
      style={{
        bottom:
          'calc(var(--tabbar-bottom) - var(--viewport-shortfall) + var(--tabbar-height) + 12px)',
      }}
    >
      <p className="max-w-sm rounded-2xl bg-label/90 px-4 py-2.5 text-center text-[14px] font-semibold text-bg shadow-bar backdrop-blur-xl">
        {message}
      </p>
    </div>,
    document.body,
  )
}

/** The message shown (or null) and a way to show one; a new message replaces the old one. */
export function useToast(): {
  readonly message: string | null
  readonly show: (message: string) => void
  readonly hide: () => void
} {
  const [message, setMessage] = useState<string | null>(null)
  // stable, so the toast's timer isn't restarted by every render
  const hide = useCallback(() => setMessage(null), [])
  return { message, show: setMessage, hide }
}
