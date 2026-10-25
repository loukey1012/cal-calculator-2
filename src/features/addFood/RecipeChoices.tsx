import { useCurrentUser } from '../../app/currentUser'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { useIngredients } from '../ingredients/hooks'
import { useRecipes } from '../recipes/hooks'
import { currentChoiceId, lineOfSlot, withChoice, withSlotIncluded } from '../recipes/recipeCooking'
import { choiceLabel, pickedChoice, type RecipeSlot } from '../recipes/recipeModel'
import { withDish, type AddFoodDraft } from './addFoodDraft'

type RecipeChoicesProps = {
  readonly draft: AddFoodDraft
  readonly onChange: (draft: AddFoodDraft) => void
}

type ChipsProps = {
  readonly label: string
  readonly slot: RecipeSlot
  readonly selectedId: string | undefined
  readonly onPick: (choiceId: string) => void
}

/** The products of one recipe line as chips: tap the one used today. */
function ChoiceChips({ label, slot, selectedId, onPick }: ChipsProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2 px-4 pt-1 pb-3">
      {slot.choices.map((choice) => {
        const selected = choice.id === selectedId
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(choice.id)}
            className={`min-h-9 rounded-full px-3.5 text-[15px] transition-colors ${
              selected
                ? 'bg-accent font-bold text-on-accent'
                : 'bg-fill font-semibold text-label-secondary'
            }`}
          >
            {choiceLabel(choice)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A dish filled from a recipe: the lines with several products as chips, optional lines as
 * switches (both as last time). Lines with a single required product need nothing here.
 */
export function RecipeChoices({ draft, onChange }: RecipeChoicesProps) {
  const { householdId } = useCurrentUser()
  const recipes = useRecipes(householdId)
  const ingredients = useIngredients(householdId)
  const link = draft.recipe
  const recipe = link && recipes.data?.find((candidate) => candidate.id === link.recipeId)
  if (!link || !recipe) return null
  const slots = recipe.slots.filter((slot) => slot.optional || slot.choices.length > 1)
  if (slots.length === 0) return null

  const apply = (cooked: { dish: AddFoodDraft['dish']; link: typeof link }) =>
    onChange({ ...withDish(draft, cooked.dish), recipe: cooked.link })
  const cooked = { dish: draft.dish, link }

  return (
    <GroupedSection header={`From “${recipe.name}”`}>
      {slots.map((slot) => {
        const included = lineOfSlot(draft.dish, link, slot.id) !== undefined
        const name = pickedChoice(slot).item.name
        return (
          <div key={slot.id}>
            {slot.optional ? (
              <ToggleRow
                label={name}
                checked={included}
                onChange={(on) => apply(withSlotIncluded(cooked, slot, on, ingredients.data ?? []))}
              />
            ) : (
              <p className="px-4 pt-3 text-[17px]">{name}</p>
            )}
            {included && slot.choices.length > 1 && (
              <ChoiceChips
                label={`${name}: product`}
                slot={slot}
                selectedId={currentChoiceId(slot, draft.dish, link)}
                onPick={(choiceId) =>
                  apply(withChoice(cooked, slot, choiceId, ingredients.data ?? []))
                }
              />
            )}
          </div>
        )
      })}
    </GroupedSection>
  )
}
