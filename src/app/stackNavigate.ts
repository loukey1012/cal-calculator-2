import { useLocation, useNavigate } from 'react-router'

/** Navigation state naming whose day a page shows, e.g. `{ person: id }` (a meal of the partner). */
type PersonState = { readonly person: string }

export function personOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('person' in state)) return null
  return typeof state.person === 'string' ? state.person : null
}

/**
 * Goes to another page of the tab's stack. Like the Settings pages it builds no browser history,
 * and it keeps the navigation state, so Today or History below still shows the person picked.
 */
export function useStackNavigate(): (path: string, state?: PersonState) => void {
  const navigate = useNavigate()
  const location = useLocation()
  return (path, state) => void navigate(path, { replace: true, state: state ?? location.state })
}
