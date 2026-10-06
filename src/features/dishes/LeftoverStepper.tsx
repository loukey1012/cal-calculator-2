import { Button } from '../../components/ios/Button'
import { withLeftoverAdded, withLeftoverRemoved } from './dishDraft'
import { isLeftover, type Dish } from './portions'

// a dish holds at most 20 portions (save_dish)
const MAX_LEFTOVERS = 10

type LeftoverStepperProps = {
  readonly dish: Dish
  readonly onChange: (dish: Dish) => void
}

/** Portions cooked for later; each takes its share like a person would. */
export function LeftoverStepper({ dish, onChange }: LeftoverStepperProps) {
  const leftoverCount = dish.portions.filter(isLeftover).length
  return (
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
  )
}
