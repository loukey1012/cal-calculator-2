import { CheckIcon } from '../../components/ios/icons'
import { Popover } from '../../components/ios/Popover'
import { MEAL_TYPES } from '../meals/dayModel'
import type { MealType } from '../meals/dayModel'

type CheatPopoverProps = {
  readonly open: boolean
  readonly anchor: HTMLElement | null
  readonly wholeDay: boolean
  readonly cheatMeals: ReadonlySet<MealType>
  readonly onToggleWholeDay: () => void
  readonly onToggleMeal: (meal: MealType) => void
  readonly onClose: () => void
}

const ROW =
  'flex min-h-11 items-center justify-between gap-6 px-4 text-left text-[16px] active:opacity-70'

function Tick({ shown }: { readonly shown: boolean }) {
  return (
    <CheckIcon aria-hidden="true" className={`h-4 w-4 text-cheat ${shown ? '' : 'invisible'}`} />
  )
}

/**
 * The cheat list: Whole day first, a line, then the four meals with a tick each. The ticks are
 * independent and it stays open while they change.
 */
export function CheatPopover({
  open,
  anchor,
  wholeDay,
  cheatMeals,
  onToggleWholeDay,
  onToggleMeal,
  onClose,
}: CheatPopoverProps) {
  return (
    <Popover open={open} anchor={anchor} label="Cheat" onClose={onClose}>
      <button type="button" aria-pressed={wholeDay} onClick={onToggleWholeDay} className={ROW}>
        Whole day
        <Tick shown={wholeDay} />
      </button>
      <div role="separator" className="h-px bg-separator" />
      {MEAL_TYPES.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          aria-pressed={cheatMeals.has(type)}
          onClick={() => onToggleMeal(type)}
          className={ROW}
        >
          {label}
          <Tick shown={cheatMeals.has(type)} />
        </button>
      ))}
    </Popover>
  )
}
