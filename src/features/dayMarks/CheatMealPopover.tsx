import { CheckIcon } from '../../components/ios/icons'
import { Popover } from '../../components/ios/Popover'
import { MEAL_TYPES } from '../meals/dayModel'
import type { MealType } from '../meals/dayModel'

type CheatMealPopoverProps = {
  readonly open: boolean
  readonly anchor: HTMLElement | null
  readonly cheatMeals: ReadonlySet<MealType>
  readonly onToggle: (meal: MealType) => void
  readonly onClose: () => void
}

/** The meals of the day with a tick each; several can be ticked, and it stays open meanwhile. */
export function CheatMealPopover({
  open,
  anchor,
  cheatMeals,
  onToggle,
  onClose,
}: CheatMealPopoverProps) {
  return (
    <Popover open={open} anchor={anchor} label="Cheat meals" onClose={onClose}>
      {MEAL_TYPES.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          aria-pressed={cheatMeals.has(type)}
          onClick={() => onToggle(type)}
          className="flex min-h-11 items-center justify-between gap-6 px-4 text-left text-[16px] active:opacity-70"
        >
          {label}
          <CheckIcon
            aria-hidden="true"
            className={`h-4 w-4 text-cheat ${cheatMeals.has(type) ? '' : 'invisible'}`}
          />
        </button>
      ))}
    </Popover>
  )
}
