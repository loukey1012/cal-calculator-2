import { GroupedSection } from '../../components/ios/GroupedSection'
import { ToggleRow } from '../../components/ios/FormRows'
import { Sheet } from '../../components/ios/Sheet'
import { cheatMeals, MEAL_TYPES } from '../meals/dayModel'
import { useDay, useCheatDay, useSetCheatMeal, useSetCheatDay } from '../meals/hooks'

type DayOptionsSheetProps = {
  readonly open: boolean
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly onClose: () => void
}

/** The day's marks: a cheat day, and which meals were cheat meals. Each switch saves at once. */
export function DayOptionsSheet({ open, userId, date, onClose }: DayOptionsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Day">
      <DayOptions userId={userId} date={date} />
    </Sheet>
  )
}

function DayOptions({ userId, date }: Pick<DayOptionsSheetProps, 'userId' | 'date'>) {
  const day = useDay(userId, date)
  const cheatDay = useCheatDay(userId, date)
  const setCheatDay = useSetCheatDay(userId, date)
  const setCheatMeal = useSetCheatMeal(userId, date)
  const cheatMealTypes = cheatMeals(day.data ?? [])

  return (
    <>
      <GroupedSection footer="Left out of averages and the weekly review. The rings show no over colors.">
        <ToggleRow
          label="Cheat day"
          checked={cheatDay.data === true}
          onChange={(checked) => setCheatDay.mutate(checked)}
        />
      </GroupedSection>
      <GroupedSection
        header="Cheat meals"
        footer="A cheat meal leaves the whole day out of averages and the weekly review, like a cheat day."
      >
        {MEAL_TYPES.map(({ type, label }) => (
          <ToggleRow
            key={type}
            label={label}
            checked={cheatMealTypes.has(type)}
            onChange={(checked) => setCheatMeal.mutate({ mealType: type, cheatMeal: checked })}
          />
        ))}
      </GroupedSection>
    </>
  )
}
