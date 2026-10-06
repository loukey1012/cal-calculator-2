import { useNavigate } from 'react-router'
import { useLeftovers } from './hooks'
import { leftoverOffers, leftoversLabel } from './leftovers'

/** Small pill while food is left over; leftovers are eaten or thrown away on Cook. */
export function LeftoversPill() {
  const leftovers = useLeftovers()
  const navigate = useNavigate()
  const offers = leftoverOffers(leftovers.data ?? [])
  if (offers.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => void navigate('/cook', { replace: true })}
      className="min-w-0 truncate rounded-full bg-accent-soft px-3 py-1 text-[13px] font-bold text-accent-ink active:opacity-60"
    >
      {leftoversLabel(offers)}
    </button>
  )
}
