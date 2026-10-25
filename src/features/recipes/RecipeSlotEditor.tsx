import { Button } from '../../components/ios/Button'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { describeLine } from '../dishes/dishDraft'
import { formatKcal } from '../nutrition/format'
import { itemTotals } from '../nutrition/totals'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { currentItem } from './recipeCooking'
import {
  choiceLabel,
  withoutChoice,
  withSlotOptional,
  type Recipe,
  type RecipeSlot,
} from './recipeModel'

type RecipeSlotEditorProps = {
  readonly recipe: Recipe
  readonly slot: RecipeSlot
  readonly ingredients: readonly Ingredient[]
  /** e.g. "Lukas", "Leftover" */
  readonly nameOf: (portionId: string) => string
  readonly onChange: (recipe: Recipe) => void
}

/** One line of a recipe: its products (one can be removed) and whether it is optional. */
export function RecipeSlotEditor({
  recipe,
  slot,
  ingredients,
  nameOf,
  onChange,
}: RecipeSlotEditorProps) {
  const canRemove = slot.choices.length > 1
  return (
    <>
      <GroupedSection
        header="Products"
        footer="A product you swap in when adding the recipe is added here when the meal is logged."
      >
        {slot.choices.map((choice) => (
          <div key={choice.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{choiceLabel(choice)}</p>
              <p className="truncate text-[13px] font-medium text-label-secondary">
                {describeLine(choice, nameOf)} ·{' '}
                {formatKcal(itemTotals(currentItem(choice.item, ingredients)).kcal)} kcal
                {choice.id === slot.pickedId ? ' · last time' : ''}
              </p>
            </div>
            {canRemove && (
              <Button
                variant="plain"
                aria-label={`Remove ${choiceLabel(choice)}`}
                onClick={() => onChange(withoutChoice(recipe, slot.id, choice.id))}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </GroupedSection>
      <GroupedSection
        footer={
          slot.optional
            ? 'Add from recipe offers it with a switch, on or off as last time.'
            : 'Always part of the dish.'
        }
      >
        <ToggleRow
          label="Optional"
          checked={slot.optional}
          onChange={(optional) => onChange(withSlotOptional(recipe, slot.id, optional))}
        />
      </GroupedSection>
    </>
  )
}
