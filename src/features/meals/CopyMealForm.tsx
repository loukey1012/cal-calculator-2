import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { fromLocalDateString } from '../../lib/dates'
import { useSaveDish } from '../dishes/hooks'
import { usePeople } from '../household/hooks'
import { PersonSwitch } from '../household/PersonSwitch'
import { useLookOf } from '../household/usePersonLook'
import { useToday } from '../today/useToday'
import { copiedDishes } from './copyMeal'
import { MEAL_TYPES, mealLabel, type MealItem, type MealType } from './dayModel'

const MEAL_OPTIONS = MEAL_TYPES.map(({ type, label }) => ({ value: type, label }))
const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }

type CopyMealFormProps = {
  readonly items: readonly MealItem[]
  /** whose meal it is: the copy goes to them unless someone else is picked */
  readonly userId: string
  readonly mealType: MealType
  /** e.g. "Copied to Lunch, Tue 20 Oct" */
  readonly onCopied: (message: string) => void
}

/** Copies the meal as it was logged to another day, meal or person. */
export function CopyMealForm({ items, userId, mealType, onCopied }: CopyMealFormProps) {
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const today = useToday()
  const saveDish = useSaveDish()
  const [personId, setPersonId] = useState(userId)
  const [date, setDate] = useState(today)
  const [targetMeal, setTargetMeal] = useState(mealType)
  const [error, setError] = useState<string | null>(null)

  function copy() {
    const eater = { userId: personId, date, mealType: targetMeal }
    try {
      for (const dish of copiedDishes(items, eater)) saveDish.save({ dish })
    } catch (failure) {
      return setError(failure instanceof Error ? failure.message : 'This meal can’t be copied.')
    }
    const day = new Intl.DateTimeFormat(undefined, DAY_FORMAT).format(fromLocalDateString(date))
    const person = people.find((candidate) => candidate.id === personId)
    const forWhom = personId === userId || !person ? '' : ` for ${lookOf(person).name}`
    onCopied(`Copied to ${mealLabel(targetMeal)}, ${day}${forWhom}`)
  }

  return (
    <>
      <p className="text-[15px] text-label-secondary">
        The copy keeps the amounts and values as they were logged.
      </p>
      <PersonSwitch people={people} selectedId={personId} onChange={setPersonId} />
      <GroupedSection header="Copy to">
        <InputRow
          label="Day"
          type="date"
          max={today}
          value={date}
          onChange={(event) => {
            const day = event.target.value
            // cleared or in the future: keep the day as it was
            if (day && day <= today) setDate(day)
          }}
          className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
        />
      </GroupedSection>
      <div className="mt-3">
        <SegmentedControl
          label="Meal"
          options={MEAL_OPTIONS}
          value={targetMeal}
          onChange={setTargetMeal}
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="mt-6">
        <Button onClick={copy}>Copy meal</Button>
      </div>
    </>
  )
}
