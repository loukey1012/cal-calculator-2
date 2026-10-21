import { useLeftovers } from './hooks'
import { leftoverOffers, leftoversLabel } from './leftovers'

/** Small pill while food is left over; it opens a meal, where leftovers are eaten or thrown away. */
export function LeftoversPill({ onOpen }: { readonly onOpen: () => void }) {
  const leftovers = useLeftovers()
  const offers = leftoverOffers(leftovers.data ?? [])
  if (offers.length === 0) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-w-0 truncate rounded-full bg-accent-soft px-3 py-1 text-[13px] font-bold text-accent-ink active:opacity-60"
    >
      {leftoversLabel(offers)}
    </button>
  )
}
