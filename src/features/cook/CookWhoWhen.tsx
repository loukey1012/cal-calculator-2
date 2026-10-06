import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import type { Profile } from '../household/householdApi'
import { PersonBadge } from '../household/PersonBadge'
import { useLookOf } from '../household/usePersonLook'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import {
  draftEaterIds,
  linesOnlyFor,
  withDate,
  withEater,
  withMealType,
  type CookDraft,
} from './cookDraft'

type CookWhoWhenProps = {
  readonly draft: CookDraft
  readonly people: readonly Profile[]
  /** local YYYY-MM-DD */
  readonly today: string
  /** the meal for the time of day, until one is chosen */
  readonly mealOfDay: MealType
  readonly onChange: (draft: CookDraft) => void
}

const MEAL_OPTIONS = MEAL_TYPES.map(({ type, label }) => ({ value: type, label }))

/** Who eats (anyone in the household), on which day and in which meal. */
export function CookWhoWhen({ draft, people, today, mealOfDay, onChange }: CookWhoWhenProps) {
  const lookOf = useLookOf()
  const eaters = draftEaterIds(draft)

  function toggle(person: Profile) {
    const eating = eaters.includes(person.id)
    if (!eating) return onChange(withEater(draft, person.id, true))
    const name = lookOf(person).name
    const ownLines = linesOnlyFor(draft, person.id)
    if (
      ownLines.length > 0 &&
      !window.confirm(`Remove ${name}? Ingredients only ${name} has are removed too.`)
    ) {
      return
    }
    onChange(withEater(draft, person.id, false))
  }

  return (
    <>
      {people.length > 1 && (
        <section className="mt-4">
          <h2 className="caption px-4 pb-2">Who eats</h2>
          <div role="group" aria-label="Who eats" className="flex flex-wrap gap-2">
            {people.map((person) => {
              const look = lookOf(person)
              const eating = eaters.includes(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  aria-label={look.name}
                  aria-pressed={eating}
                  // someone always eats
                  disabled={eating && eaters.length === 1}
                  onClick={() => toggle(person)}
                  className={`flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 text-[15px] transition-colors ${
                    eating
                      ? 'bg-bg-elevated font-bold text-label shadow-card'
                      : 'font-semibold text-label-secondary opacity-70'
                  }`}
                >
                  <PersonBadge look={look} />
                  {look.name}
                </button>
              )
            })}
          </div>
        </section>
      )}
      <GroupedSection header="When">
        <InputRow
          label="Day"
          type="date"
          max={today}
          value={draft.date ?? today}
          onChange={(event) => {
            const day = event.target.value
            // cleared or in the future: keep the day as it was
            if (day && day <= today) onChange(withDate(draft, day, today))
          }}
          className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
        />
      </GroupedSection>
      <div className="mt-3">
        <SegmentedControl
          label="Meal"
          options={MEAL_OPTIONS}
          value={draft.mealType ?? mealOfDay}
          onChange={(mealType) => onChange(withMealType(draft, mealType))}
        />
      </div>
    </>
  )
}
