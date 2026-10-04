import { onlineManager, useMutationState } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { DAY_CHANGES_KEY } from '../features/meals/dayChanges'

function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  )
}

function changes(count: number): string {
  return count === 1 ? '1 change' : `${count} changes`
}

function statusText(online: boolean, pending: number): string | null {
  if (!online) return pending > 0 ? `Offline · ${changes(pending)} pending` : 'Offline'
  return pending > 0 ? `Saving ${changes(pending)}…` : null
}

/** Small pill above the tab bar while offline or while meal changes are still being saved. */
export function SyncStatus() {
  const online = useIsOnline()
  const pending = useMutationState({
    filters: { mutationKey: DAY_CHANGES_KEY, status: 'pending' },
  }).length
  const text = statusText(online, pending)
  if (text === null) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-height)+var(--tabbar-bottom)+8px)] z-20 flex justify-center"
    >
      <span className="rounded-full bg-label/80 px-3 py-1 text-[13px] font-medium text-bg backdrop-blur">
        {text}
      </span>
    </div>
  )
}
