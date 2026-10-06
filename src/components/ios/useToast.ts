import { useCallback, useState } from 'react'

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
