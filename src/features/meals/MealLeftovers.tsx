import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { takeLeftover, throwAwayLeftover } from '../dishes/dishDraft'
import { useLeftovers, useSaveDish } from '../dishes/hooks'
import { leftoverOffers, type LeftoverOffer } from '../dishes/leftovers'
import { formatKcalTotal } from '../nutrition/format'
import { mealLabel } from './dayModel'
import type { MealRef } from './mealPages'

/** The household's leftovers, on a meal's page: each can be eaten at this meal or thrown away. */
export function MealLeftovers({ meal }: { readonly meal: MealRef }) {
  const leftovers = useLeftovers()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const offers = leftoverOffers(leftovers.data ?? [])
  const selected = offers.find((offer) => offer.portionId === selectedId)
  if (offers.length === 0) return null

  return (
    <>
      <GroupedSection header="Leftovers" footer="Leftovers of the last 7 days.">
        {offers.map((offer) => (
          <ListRow
            key={offer.portionId}
            title={offer.title}
            subtitle="1 portion"
            detail={`${formatKcalTotal(offer.totals)} kcal`}
            onClick={() => setSelectedId(offer.portionId)}
          />
        ))}
      </GroupedSection>
      <Sheet
        open={selected !== undefined}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? ''}
      >
        {selected && (
          <LeftoverActions offer={selected} meal={meal} onDone={() => setSelectedId(null)} />
        )}
      </Sheet>
    </>
  )
}

type LeftoverActionsProps = {
  readonly offer: LeftoverOffer
  readonly meal: MealRef
  readonly onDone: () => void
}

function LeftoverActions({ offer, meal, onDone }: LeftoverActionsProps) {
  const saveDish = useSaveDish()
  return (
    <>
      <p className="text-[15px] text-label-secondary">
        1 portion · {formatKcalTotal(offer.totals)} kcal
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          onClick={() => {
            saveDish.save({ dish: takeLeftover(offer.dish, offer.portionId, meal) })
            onDone()
          }}
        >
          Add to {mealLabel(meal.mealType)}
        </Button>
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
