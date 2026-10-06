import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import { withoutPortion, withPortion, withPortionMeal } from './dishDraft'
import type { Dish } from './portions'

const NOT_EATING = 'none'

type WhoEatsSectionProps = {
  readonly dish: Dish
  readonly people: readonly Profile[]
  /** the day someone added here eats on */
  readonly date: string
  readonly onChange: (dish: Dish) => void
}

/** Editing a saved dish: who eats it in which meal. */
export function WhoEatsSection({ dish, people, date, onChange }: WhoEatsSectionProps) {
  const lookOf = useLookOf()
  const portionOf = (userId: string) =>
    dish.portions.find((portion) => portion.eater?.userId === userId)

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
    </GroupedSection>
  )
}
