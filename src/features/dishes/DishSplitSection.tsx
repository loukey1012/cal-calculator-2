import { Button } from '../../components/ios/Button'
import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import { DecimalRow } from './DecimalRow'
import {
  withCookedWeight,
  withLeftoverAdded,
  withLeftoverRemoved,
  withoutPortion,
  withPortion,
  withPortionMeal,
  withSplitMode,
  withSplitValue,
} from './dishDraft'
import { isLeftover, type Dish, type SplitMode } from './portions'

const NOT_EATING = 'none'
// a dish holds at most 20 portions (save_dish)
const MAX_LEFTOVERS = 10

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
  /** e.g. "baby", "Leftover" */
  readonly nameOf: (portionId: string) => string
  readonly onChange: (dish: Dish) => void
}

/** Who eats in which meal, and how the shared ingredients are divided. */
export function DishSplitSection({ dish, people, date, nameOf, onChange }: DishSplitSectionProps) {
  const lookOf = useLookOf()
  const portionOf = (userId: string) =>
    dish.portions.find((portion) => portion.eater?.userId === userId)
  const splitInput = dish.splitMode === 'equal' ? null : SPLIT_INPUT[dish.splitMode]
  const leftoverCount = dish.portions.filter(isLeftover).length

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
            label={lookOf(person).name}
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
        <div className="flex items-center gap-2 py-1.5 pr-2 pl-4">
          <span className="flex-1 text-[17px]">Leftover portions</span>
          <Button
            variant="plain"
            aria-label="Fewer leftover portions"
            disabled={leftoverCount === 0}
            onClick={() => onChange(withLeftoverRemoved(dish))}
            className="text-[24px]"
          >
            −
          </Button>
          <span className="w-6 text-center text-[17px] font-semibold">{leftoverCount}</span>
          <Button
            variant="plain"
            aria-label="More leftover portions"
            disabled={leftoverCount >= MAX_LEFTOVERS}
            onClick={() => onChange(withLeftoverAdded(dish))}
            className="text-[24px]"
          >
            +
          </Button>
        </div>
      </GroupedSection>
      {dish.portions.length > 1 && (
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
              {dish.portions.map((portion) => (
                <DecimalRow
                  // a new split starts from new values
                  key={`${dish.splitMode}:${portion.id}`}
                  label={nameOf(portion.id)}
                  accessibleLabel={`${nameOf(portion.id)} ${splitInput.noun}`}
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
