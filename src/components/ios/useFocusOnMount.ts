import { useEffect, useRef } from 'react'

/** Moves keyboard and screen reader focus to an element when its view appears. */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}
