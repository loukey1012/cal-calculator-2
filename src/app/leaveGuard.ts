import { useEffect, useRef } from 'react'

const guards = new Map<string, () => boolean>()

/**
 * Lets a page veto the back swipe away from it, e.g. a note with unsaved changes asking
 * "Discard changes?". Only the guard of the page being left is asked, so a guard of another
 * tab's page never interferes. A guard that throws never traps the user: the swipe goes back.
 */
export function canLeavePage(path: string): boolean {
  const guard = guards.get(path)
  if (!guard) return true
  try {
    return guard()
  } catch (error) {
    console.error('A leave guard threw; leaving the page anyway', error)
    return true
  }
}

/**
 * While mounted, `canLeave` is asked before a back swipe leaves the page at `path`. The latest
 * `canLeave` is always used; it is registered once per mount.
 */
export function useLeaveGuard(path: string, canLeave: () => boolean): void {
  const latest = useRef(canLeave)
  useEffect(() => {
    latest.current = canLeave
  })
  useEffect(() => {
    const guard = () => latest.current()
    guards.set(path, guard)
    return () => {
      if (guards.get(path) === guard) guards.delete(path)
    }
  }, [path])
}
