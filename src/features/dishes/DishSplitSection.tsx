import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { displayName } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import { DecimalRow } from './DecimalRow'
import {
  withCookedWeight,
  withoutPortion,
  withPortion,
  withPortionMeal,
  withSplitMode,
  withSplitValue,
} from './dishDraft'
import type { Dish, SplitMode } from './portions'

const NOT_EATING = 'none'

const SPLIT_OPTIONS: ReadonlyArray<{ readonly value: SplitMode; readonly label: string }> = [
  { value: 'equal', label: 'Equal' },
  { value: 'count', label: 'Count' },
  { value: 'percent', label: '%' },
  { value: 'weight', label: 'Weight' },
]

const SPLIT_INPUT: Record<
  Exclude<SplitMode, 'equal'>,
  { readonly noun: string; readonly suffix?: string; readonly footer: string }
> = {
  count: { noun: 'count', footer: 'E.g. toasts or servings each person had.' },
  percent: { noun: 'percent', suffix: '%', footer: 'What is left over is logged for nobody.' },
  weight: {
    noun: 'plate weight',
    suffix: 'g',
    footer: 'Weigh the whole cooked dish, then each plate.',
  },
}

type DishSplitSectionProps = {
  readonly dish: Dish
  readonly people: readonly Profile[]
  /** the day new portions are logged on */
  readonly date: string
  readonly onChange: (dish: Dish) => void
}

/** Who eats in which meal, and how the shared ingredients are divided. */
export function DishSplitSection({ dish, people, date, onChange }: DishSplitSectionProps) {
  const portionOf = (userId: string) =>
    dish.portions.find((portion) => portion.eater?.userId === userId)
  const splitInput = dish.splitMode === 'equal' ? null : SPLIT_INPUT[dish.splitMode]
  const eating = people.flatMap((person) => {
    const portion = portionOf(person.id)
    return portion ? [{ person, portion }] : []
  })

  function setMeal(person: Profile, value: string) {
    const portion = portionOf(person.id)
    if (value === NOT_EATING) {
      if (portion) onChange(withoutPortion(dish, portion.id))
      return
    }
    const mealType = value as MealType
    onChange(
      portion
        ? withPortionMeal(dish, portion.id, mealType)
        : withPortion(dish, { userId: person.id, date, mealType }),
    )
  }

  return (
    <>
      <GroupedSection header="Who eats">
        {people.map((person) => (
          <SelectRow
            key={person.id}
            label={displayName(person)}
            value={portionOf(person.id)?.eater?.mealType ?? NOT_EATING}
            onChange={(event) => setMeal(person, event.target.value)}
          >
            {MEAL_TYPES.map(({ type, label }) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
            <option value={NOT_EATING}>Not eating</option>
          </SelectRow>
        ))}
      </GroupedSection>
      {eating.length > 1 && (
        <section className="mt-6">
          <h2 className="caption px-4 pb-2">Split</h2>
          <SegmentedControl
            label="Split"
            options={SPLIT_OPTIONS}
            value={dish.splitMode}
            onChange={(mode) => onChange(withSplitMode(dish, mode))}
          />
          {splitInput && (
            <GroupedSection footer={splitInput.footer}>
              {dish.splitMode === 'weight' && (
                <DecimalRow
                  label="Cooked dish"
                  accessibleLabel="Cooked dish weight"
                  suffix="g"
                  value={dish.cookedWeightG}
                  onChange={(value) => onChange(withCookedWeight(dish, value))}
                />
              )}
              {eating.map(({ person, portion }) => (
                <DecimalRow
                  // a new split starts from new values
                  key={`${dish.splitMode}:${portion.id}`}
                  label={displayName(person)}
                  accessibleLabel={`${displayName(person)} ${splitInput.noun}`}
                  suffix={splitInput.suffix}
                  value={portion.splitValue}
                  onChange={(value) => onChange(withSplitValue(dish, portion.id, value))}
                />
              ))}
            </GroupedSection>
          )}
        </section>
      )}
    </>
  )
}
