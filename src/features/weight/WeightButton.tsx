import { useState } from 'react'
import { ScaleIcon } from '../../components/ios/icons'
import { useWeights } from './hooks'
import { formatKg, weightOn } from './weight'
import { WeightSheet } from './WeightSheet'

type WeightButtonProps = {
  readonly userId: string
  readonly today: string
  /** only your own weight can be entered; a partner's is just shown */
  readonly isOwn: boolean
}

const PILL =
  'flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-bg-elevated px-3 text-[15px] font-bold shadow-card'

/** Today's header: the current weight; tap to enter today's. */
export function WeightButton({ userId, today, isOwn }: WeightButtonProps) {
  const weights = useWeights(userId)
  const [editing, setEditing] = useState(false)
  if (weights.isPending) return null
  const entries = weights.data ?? []
  const current = weightOn(entries, today)
  const text = current ? formatKg(current.weightKg) : 'Add weight'

  if (!isOwn) {
    return current ? (
      <span className={`${PILL} text-label-secondary`}>
        <ScaleIcon className="h-4 w-4" />
        <span className="sr-only">Weight </span>
        {text}
      </span>
    ) : null
  }
  return (
    <>
      <button
        type="button"
        aria-label={current ? `Weight ${text}` : text}
        onClick={() => setEditing(true)}
        className={`${PILL} text-label active:opacity-60`}
      >
        <ScaleIcon className="h-4 w-4 text-accent-ink" />
        {text}
      </button>
      {editing && (
        <WeightSheet
          userId={userId}
          entries={entries}
          date={today}
          today={today}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
