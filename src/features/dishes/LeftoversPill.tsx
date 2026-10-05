import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { MEAL_TYPES } from '../meals/dayModel'
import { formatKcal } from '../nutrition/format'
import { takeLeftover, throwAwayLeftover } from './dishDraft'
import { useLeftovers, useSaveDish } from './hooks'
import { leftoverOffers, leftoversLabel, type LeftoverOffer } from './leftovers'

type LeftoversPillProps = {
  /** whose day a leftover is logged into */
  readonly userId: string
  readonly date: string
}

/** Small pill while food is left over; opens a sheet to eat it in a meal or throw it away. */
export function LeftoversPill({ userId, date }: LeftoversPillProps) {
  const leftovers = useLeftovers()
  const [open, setOpen] = useState(false)
  const offers = leftoverOffers(leftovers.data ?? [])
  if (offers.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-0 truncate rounded-full bg-accent-soft px-3 py-1 text-[13px] font-bold text-accent-ink active:opacity-60"
      >
        {leftoversLabel(offers)}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Leftovers">
        <LeftoversList offers={offers} userId={userId} date={date} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}

type LeftoversListProps = LeftoversPillProps & {
  readonly offers: readonly LeftoverOffer[]
  readonly onDone: () => void
}

function LeftoversList({ offers, userId, date, onDone }: LeftoversListProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const saveDish = useSaveDish()
  const offer = offers.find((candidate) => candidate.portionId === selected)

  if (!offer) {
    return (
      <GroupedSection footer="Leftovers of the last 7 days.">
        {offers.map((candidate) => (
          <ListRow
            key={candidate.portionId}
            title={candidate.title}
            subtitle={`1 portion · ${formatKcal(candidate.totals.kcal)} kcal`}
            onClick={() => setSelected(candidate.portionId)}
          />
        ))}
      </GroupedSection>
    )
  }

  return (
    <>
      <Button variant="plain" aria-label="Back" className="-ml-2" onClick={() => setSelected(null)}>
        ‹ Back
      </Button>
      <h3 className="mt-2 text-[20px] font-semibold">{offer.title}</h3>
      <p className="text-[15px] text-label-secondary">
        1 portion · {formatKcal(offer.totals.kcal)} kcal
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {MEAL_TYPES.map(({ type, label }) => (
          <Button
            key={type}
            variant="secondary"
            onClick={() => {
              const eater = { userId, date, mealType: type }
              saveDish.save({ dish: takeLeftover(offer.dish, offer.portionId, eater) })
              onDone()
            }}
          >
            Add to {label}
          </Button>
        ))}
        <Button
          variant="destructive"
          onClick={() => {
            saveDish.save({ dish: throwAwayLeftover(offer.dish, offer.portionId) })
            onDone()
          }}
        >
          Throw away
        </Button>
      </div>
    </>
  )
}
