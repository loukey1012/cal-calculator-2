import { ListRow } from '../../components/ios/ListRow'
import type { Ingredient } from './ingredientsApi'
import { nutritionSummary } from './listing'
import { needsCheck } from './valueChecks'

export const CHECK_VALUES_LABEL = 'Check values'

type IngredientRowProps = {
  readonly ingredient: Ingredient
  readonly onClick: () => void
}

/**
 * An ingredient in a list: its brand above the name (easy to scan for), its calories below, and
 * "Check values" when its values look wrong.
 */
export function IngredientRow({ ingredient, onClick }: IngredientRowProps) {
  return (
    <ListRow
      overline={ingredient.brand?.trim() || undefined}
      title={ingredient.name}
      subtitle={nutritionSummary(ingredient)}
      detail={
        needsCheck(ingredient) ? (
          <span className="text-[13px] font-bold text-destructive">{CHECK_VALUES_LABEL}</span>
        ) : undefined
      }
      onClick={onClick}
    />
  )
}
