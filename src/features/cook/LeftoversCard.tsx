import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { Sheet } from '../../components/ios/Sheet'
import { takeLeftover, throwAwayLeftover } from '../dishes/dishDraft'
import { useLeftovers, useSaveDish } from '../dishes/hooks'
import { leftoverOffers, type LeftoverOffer } from '../dishes/leftovers'
import { usePeople } from '../household/hooks'
import { PersonSwitch } from '../household/PersonSwitch'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import { formatKcalTotal } from '../nutrition/format'

const MEAL_OPTIONS = MEAL_TYPES.map(({ type, label }) => ({ value: type, label }))

type LeftoversCardProps = {
  /** local YYYY-MM-DD: a leftover is eaten today */
  readonly today: string
  /** suggested meal */
  readonly mealOfDay: MealType
}

/** The household's leftovers; each can be eaten in a meal or thrown away. */
export function LeftoversCard({ today, mealOfDay }: LeftoversCardProps) {
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
          <LeftoverActions
            offer={selected}
            today={today}
            mealOfDay={mealOfDay}
            onDone={() => setSelectedId(null)}
          />
        )}
      </Sheet>
    </>
  )
}

type LeftoverActionsProps = LeftoversCardProps & {
  readonly offer: LeftoverOffer
  readonly onDone: () => void
}

function LeftoverActions({ offer, today, mealOfDay, onDone }: LeftoverActionsProps) {
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const saveDish = useSaveDish()
  const [personId, setPersonId] = useState(profile.id)
  const [mealType, setMealType] = useState<MealType>(mealOfDay)

  return (
    <>
      <p className="text-[15px] text-label-secondary">
        1 portion · {formatKcalTotal(offer.totals)} kcal
      </p>
      <PersonSwitch people={people} selectedId={personId} onChange={setPersonId} />
      <div className="mt-4">
        <SegmentedControl
          label="Meal"
          options={MEAL_OPTIONS}
          value={mealType}
          onChange={setMealType}
        />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          onClick={() => {
            const eater = { userId: personId, date: today, mealType }
            saveDish.save({ dish: takeLeftover(offer.dish, offer.portionId, eater) })
            onDone()
          }}
        >
          Add to meal
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
