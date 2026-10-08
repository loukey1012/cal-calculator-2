import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export const TOAST_DURATION_MS = 3000

type ToastAction = { readonly label: string; readonly onPress: () => void }

type ToastProps = {
  /** null while nothing is shown */
  readonly message: string | null
  /** a button next to the message, e.g. "Update" */
  readonly action?: ToastAction
  readonly durationMs?: number
  readonly onDone: () => void
}

/**
 * A short message floating above the tab bar that goes away by itself. Rendered into the body,
 * outside the tab carousel (whose transforms would move a fixed element).
 */
export function Toast({ message, action, durationMs = TOAST_DURATION_MS, onDone }: ToastProps) {
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(onDone, durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs, onDone])

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
      <div className="flex max-w-sm items-center gap-3 rounded-2xl bg-label/90 px-4 py-2.5 text-[14px] font-semibold text-bg shadow-bar backdrop-blur-xl">
        <p className="text-center">{message}</p>
        {action && (
          <button
            type="button"
            className="pointer-events-auto -my-1 rounded-full bg-bg/20 px-3 py-1 font-semibold active:opacity-70"
            onClick={action.onPress}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
