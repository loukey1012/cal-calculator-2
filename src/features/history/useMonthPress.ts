import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import { addMonths } from './calendar'
import { SWALLOW_CLICK_MS } from './swallowNextClick'

/** how far a sideways drag must go, and how much more sideways than vertical, to turn the month */
const SWIPE_MIN_PX = 50
const SWIPE_SIDEWAYS_RATIO = 2
/** holding a day this long (without moving) opens its quick look */
const LONG_PRESS_MS = 500
/** a finger drifting less than this still counts as holding */
const HOLD_DRIFT_PX = 10

type Point = { readonly x: number; readonly y: number }
/** the press in progress: where it began, and whether holding it opened the quick look */
type Press = { readonly start: Point; opened: boolean }

type MonthPressOptions = {
  readonly month: string
  /** there is no month after this one */
  readonly isCurrentMonth: boolean
  readonly onChangeMonth: (month: string) => void
  /** holding a day (YYYY-MM-DD) for long enough */
  readonly onHold: ((date: string) => void) | undefined
  /** the finger left the screen, or the press was cancelled; `heldOpen`: holding had opened a look */
  readonly onRelease: (heldOpen: boolean) => void
}

/**
 * Swipes and holds on the month grid. Only the first finger counts (or the main mouse button).
 * Once a press starts it is followed on the window, so it ends properly wherever the finger lifts.
 */
export function useMonthPress(options: MonthPressOptions) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopListening = useRef<(() => void) | null>(null)
  // after a swipe or a hold the finger lifts over a day: the click that follows must not select it
  const swallowClickUntil = useRef(0)
  // what the listeners of a press read, as they outlive the render that started them
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  const stopHold = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }, [])
  const endPress = useCallback(() => {
    stopHold()
    stopListening.current?.()
    stopListening.current = null
  }, [stopHold])
  // a press does not outlive the calendar or its month
  useEffect(() => endPress, [endPress])
  useEffect(() => endPress(), [options.month, endPress])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
      endPress()
      // a swallow left over from a hold whose click never came must not eat this press's tap
      swallowClickUntil.current = 0
      const press: Press = { start: { x: event.clientX, y: event.clientY }, opened: false }

      function onMove(moved: globalThis.PointerEvent) {
        if (!moved.isPrimary) return
        const drift = Math.hypot(moved.clientX - press.start.x, moved.clientY - press.start.y)
        if (drift > HOLD_DRIFT_PX) stopHold()
      }
      function onUp(lifted: globalThis.PointerEvent) {
        if (!lifted.isPrimary) return
        endPress()
        latest.current.onRelease(press.opened)
        // holding is not swiping, however far the finger drifted afterwards
        if (press.opened) swallowClickUntil.current = Date.now() + SWALLOW_CLICK_MS
        else turnMonthIfSwiped(press.start, lifted)
      }
      function turnMonthIfSwiped(start: Point, lifted: globalThis.PointerEvent) {
        const dx = lifted.clientX - start.x
        const dy = lifted.clientY - start.y
        const isSwipe =
          Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) >= SWIPE_SIDEWAYS_RATIO * Math.abs(dy)
        if (!isSwipe) return
        swallowClickUntil.current = Date.now() + SWALLOW_CLICK_MS
        const { month, isCurrentMonth, onChangeMonth } = latest.current
        // swiping left looks ahead, but there is nothing after the current month
        if (dx > 0) onChangeMonth(addMonths(month, -1))
        else if (!isCurrentMonth) onChangeMonth(addMonths(month, 1))
      }
      function onCancel(cancelled: globalThis.PointerEvent) {
        if (!cancelled.isPrimary) return
        endPress()
        latest.current.onRelease(press.opened)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      stopListening.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      }

      const day = event.target instanceof Element ? event.target.closest('button[data-date]') : null
      if (!(day instanceof HTMLButtonElement) || day.disabled || !latest.current.onHold) return
      const date = day.dataset.date ?? ''
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null
        press.opened = true
        latest.current.onHold?.(date)
      }, LONG_PRESS_MS)
    },
    [endPress, stopHold],
  )

  /** Capture phase: stops the click that follows a swipe or hold from reaching the day. */
  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (Date.now() >= swallowClickUntil.current) return
    swallowClickUntil.current = 0
    event.stopPropagation()
  }, [])

  return { onPointerDown, onClickCapture }
}
