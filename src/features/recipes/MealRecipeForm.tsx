import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useDish } from '../dishes/hooks'
import { mealEntries, type MealItem } from '../meals/dayModel'
import { recipeFromDish, recipeFromMeal } from './recipeModel'
import { SaveRecipeForm } from './SaveRecipeForm'

type MealRecipeFormProps = {
  readonly items: readonly MealItem[]
  /** whose meal it is */
  readonly userId: string
  readonly onSaved: () => void
}

/** The dish a meal consists of, when it is exactly one (cooked together or a single food). */
function onlyDishId(items: readonly MealItem[]): string | null {
  const entries = mealEntries(items)
  const [entry] = entries
  if (entries.length !== 1 || !entry) return null
  if (entry.kind === 'food') return entry.dishId
  if (entry.kind === 'dish') return entry.items.find((item) => item.dish)?.dish?.id ?? null
  return null
}

/**
 * A logged meal saved as a recipe. A meal of one dish keeps the whole dish (everyone who ate it,
 * own amounts, split); a meal of several is merged into one dish of what this person ate.
 */
export function MealRecipeForm({ items, userId, onSaved }: MealRecipeFormProps) {
  const dishId = onlyDishId(items)
  const dish = useDish(dishId)

  if (dishId === null) {
    return (
      <>
        <p className="text-[15px] text-label-secondary">
          Everything in this meal is saved together as one dish.
        </p>
        <SaveRecipeForm
          initialName=""
          existing={null}
          build={(name, id) => recipeFromMeal(items, userId, name, id)}
          onSaved={onSaved}
        />
      </>
    )
  }
  if (dish.isError) return <ErrorBanner message={toUserMessage(dish.error)} />
  if (dish.isPending || dish.data === null) {
    return (
      <p className="mt-6 text-center text-[15px] text-label-secondary">
        {dish.isPending ? 'Loading…' : 'This dish was deleted.'}
      </p>
    )
  }
  const loaded = dish.data
  return (
    <SaveRecipeForm
      initialName={
        loaded.name ?? (loaded.lines.length === 1 ? (loaded.lines[0]?.item.name ?? '') : '')
      }
      existing={null}
      build={(name, id) => recipeFromDish(loaded, name, id)}
      onSaved={onSaved}
    />
  )
}
