import { useEffect, useRef } from 'react'

type Point = { readonly x: number; readonly y: number }

// how far right a finger must travel, and how much straighter than vertical, to mean "back"
const MIN_BACK_DISTANCE = 80
const MAX_VERTICAL_RATIO = 0.5

/** A drag that goes clearly to the right, like the iOS back swipe. */
export function isBackSwipe(start: Point, end: Point): boolean {
  const dx = end.x - start.x
  const dy = Math.abs(end.y - start.y)
  return dx >= MIN_BACK_DISTANCE && dy <= dx * MAX_VERTICAL_RATIO
}

/**
 * Calls `onBack` when the user swipes right on `element` (gestures starting inside
 * `[data-swipe-lock]` stay local). Does nothing while `onBack` is null.
 */
export function useSwipeBack(element: HTMLElement | null, onBack: (() => void) | null): void {
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])
  const active = onBack !== null

  useEffect(() => {
    if (!element || !active) return
    let start: Point | null = null
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      const locked = event.target instanceof Element && event.target.closest('[data-swipe-lock]')
      start = touch && !locked ? { x: touch.clientX, y: touch.clientY } : null
    }
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (start && touch && isBackSwipe(start, { x: touch.clientX, y: touch.clientY }))
        onBackRef.current?.()
      start = null
    }
    element.addEventListener('touchstart', onStart, { passive: true })
    element.addEventListener('touchend', onEnd)
    return () => {
      element.removeEventListener('touchstart', onStart)
      element.removeEventListener('touchend', onEnd)
    }
  }, [element, active])
}
