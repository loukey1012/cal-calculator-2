import { Button } from '../../components/ios/Button'
import { ChevronLeftIcon } from '../../components/ios/icons'
import { useFocusOnMount } from '../../components/ios/useFocusOnMount'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { IngredientPickList } from '../ingredients/IngredientPickList'

type MergeWithPickerProps = {
  /** the ingredient being edited; it can't be merged with itself */
  readonly current: Ingredient
  readonly ingredients: readonly Ingredient[]
  readonly onPick: (ingredient: Ingredient) => void
  readonly onBack: () => void
}

/** Pick the ingredient to merge the edited one with. */
export function MergeWithPicker({ current, ingredients, onPick, onBack }: MergeWithPickerProps) {
  const heading = useFocusOnMount<HTMLHeadingElement>()
  return (
    <div className="flex flex-col gap-3 pb-4">
      <Button
        variant="plain"
        className="-ml-2 flex items-center gap-0.5 self-start"
        onClick={onBack}
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back
      </Button>
      <h2 ref={heading} tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
        Merge with…
      </h2>
      <p className="text-[14px] font-medium text-label-secondary">
        Pick the ingredient that is the same as {current.name}.
      </p>
      <IngredientPickList
        label="Search ingredients to merge with"
        ingredients={ingredients.filter(({ id }) => id !== current.id)}
        onPick={onPick}
      />
    </div>
  )
}
