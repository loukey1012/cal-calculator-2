import { ListRow } from '../../components/ios/ListRow'
import type { Ingredient } from './ingredientsApi'
import { nutritionSummary } from './listing'

type IngredientRowProps = {
  readonly ingredient: Ingredient
  readonly onClick: () => void
}

/** An ingredient in a list: its brand above the name (easy to scan for), its calories below. */
export function IngredientRow({ ingredient, onClick }: IngredientRowProps) {
  return (
    <ListRow
      overline={ingredient.brand?.trim() || undefined}
      title={ingredient.name}
      subtitle={nutritionSummary(ingredient)}
      onClick={onClick}
    />
  )
}
