import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { useMembers } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import type { Ingredient } from '../ingredients/ingredientsApi'
import type { MealItem, MealType } from '../meals/dayModel'
import { CustomItemForm } from '../meals/CustomItemForm'
import { FoodPicker } from '../meals/FoodPicker'
import { availableUnits } from '../nutrition/amounts'
import { formatKcal } from '../nutrition/format'
import { ingredientNutrition, ingredientSource } from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'
import {
  describeLine,
  lineFromItem,
  lineWho,
  newDish,
  newId,
  rescaledLine,
  withLine,
  withName,
  withoutLine,
} from './dishDraft'
import { DishLineEditor, type PortionOption } from './DishLineEditor'
import { DishSplitSection } from './DishSplitSection'
import { DishTotals } from './DishTotals'
import { useDeleteDish, useDish, useSaveDish, type SaveDishRequest } from './hooks'
import { buildDishLine, isLeftover, type Dish } from './portions'

type DishEditorProps = {
  /** null for a new dish */
  readonly dishId: string | null
  /** whose meal the editor was opened from: listed first, eats by default */
  readonly personId: string
  readonly date: string
  readonly mealType: MealType
  /** "share this meal": these plain items of the meal become the new dish's lines */
  readonly sharedItems?: readonly MealItem[]
  readonly onDone: () => void
}

type View =
  | { readonly kind: 'main' }
  | { readonly kind: 'pick' }
  | { readonly kind: 'custom' }
  | { readonly kind: 'newLine'; readonly ingredient: Ingredient; readonly lineId: string }
  | { readonly kind: 'editLine'; readonly lineId: string }

function peopleFor(me: Profile, members: readonly Profile[] | undefined, personId: string) {
  const everyone = members && members.length > 0 ? members : [me]
  return [
    ...everyone.filter((person) => person.id === personId),
    ...everyone.filter((person) => person.id !== personId),
  ]
}

function Message({ text }: { readonly text: string }) {
  return <p className="mt-6 text-center text-[15px] text-label-secondary">{text}</p>
}

/** Cook together: a new dish, or an existing one loaded for editing. */
export function DishEditor({
  dishId,
  personId,
  date,
  mealType,
  sharedItems = [],
  onDone,
}: DishEditorProps) {
  const { profile, householdId } = useCurrentUser()
  const members = useMembers(householdId)
  const existing = useDish(dishId)
  const people = peopleFor(profile, members.data, personId)

  if (dishId !== null) {
    if (existing.isError) return <ErrorBanner message={toUserMessage(existing.error)} />
    if (existing.isPending) return <Message text="Loading…" />
    if (existing.data === null) return <Message text="This dish was deleted." />
  } else if (members.isPending) {
    return <Message text="Loading…" />
  }

  const initial = existing.data ?? {
    ...newDish(people.map((person) => ({ userId: person.id, date, mealType }))),
    lines: sharedItems.map(lineFromItem),
  }
  const replaces =
    sharedItems.length > 0
      ? { day: { userId: personId, date }, itemIds: sharedItems.map((item) => item.id) }
      : undefined
  return (
    <DishForm
      key={dishId ?? 'new'}
      initial={initial}
      isNew={dishId === null}
      replaces={replaces}
      people={people}
      date={date}
      onDone={onDone}
    />
  )
}

/** "baby", "Leftover" (or "Leftover 2" when there are several), "Thrown away" */
function portionName(
  dish: Dish,
  people: readonly Profile[],
  nameOfPerson: (person: Profile) => string,
  portionId: string,
): string {
  const portion = dish.portions.find((candidate) => candidate.id === portionId)
  if (portion?.eater) {
    const person = people.find((candidate) => candidate.id === portion.eater?.userId)
    return person ? nameOfPerson(person) : 'Someone else'
  }
  if (portion?.discarded) return 'Thrown away'
  const leftovers = dish.portions.filter(isLeftover)
  const index = leftovers.findIndex((candidate) => candidate.id === portionId)
  return leftovers.length > 1 ? `Leftover ${index + 1}` : 'Leftover'
}

type DishFormProps = {
  readonly initial: Dish
  readonly isNew: boolean
  readonly replaces?: SaveDishRequest['replaces']
  readonly people: readonly Profile[]
  readonly date: string
  readonly onDone: () => void
}

function DishForm({ initial, isNew, replaces, people, date, onDone }: DishFormProps) {
  const [draft, setDraft] = useState(initial)
  const [view, setView] = useState<View>({ kind: 'main' })
  const [error, setError] = useState<string | null>(null)
  const saveDish = useSaveDish()
  const deleteDish = useDeleteDish()
  const showMain = () => setView({ kind: 'main' })
  const lookOf = useLookOf()
  const nameOf = (portionId: string) =>
    portionName(draft, people, (person) => lookOf(person).name, portionId)
  // own amounts can go to leftovers too, e.g. noodles for tomorrow
  const eaters: PortionOption[] = draft.portions.flatMap((portion) =>
    portion.discarded ? [] : [{ id: portion.id, name: nameOf(portion.id) }],
  )
  const change = (next: Dish) => {
    setDraft(next)
    setError(null)
  }
  const addLine = (line: Dish['lines'][number]) => {
    change(withLine(draft, line))
    showMain()
  }

  function save() {
    if (draft.lines.length === 0) return setError('Add at least one ingredient')
    if (!draft.portions.some((portion) => portion.eater)) return setError('Choose who eats')
    try {
      saveDish.save({ dish: draft, replaces })
      onDone()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'This dish can’t be saved.')
    }
  }

  const back = (
    <Button variant="plain" aria-label="Back" className="-ml-2" onClick={showMain}>
      ‹ Back
    </Button>
  )

  switch (view.kind) {
    case 'pick':
      return (
        <>
          {back}
          <FoodPicker
            onPick={(ingredient) => setView({ kind: 'newLine', ingredient, lineId: newId() })}
            onCustom={() => setView({ kind: 'custom' })}
          />
        </>
      )
    case 'custom':
      return (
        <>
          {back}
          <CustomItemForm
            confirmLabel="Add to dish"
            onConfirm={({ source, amount, unit }) =>
              addLine(buildDishLine({ id: newId(), source, unit, allocation: 'shared', amount }))
            }
          />
        </>
      )
    case 'newLine': {
      const { ingredient, lineId } = view
      return (
        <>
          {back}
          <DishLineEditor
            title={ingredient.name}
            units={availableUnits(ingredientNutrition(ingredient))}
            unitLabel={ingredient.unit_label}
            portions={eaters}
            confirmLabel="Add to dish"
            build={(input) =>
              buildDishLine({ ...input, id: lineId, source: ingredientSource(ingredient) })
            }
            onConfirm={addLine}
          />
        </>
      )
    }
    case 'editLine': {
      const line = draft.lines.find((candidate) => candidate.id === view.lineId)
      if (!line) return null
      const who = lineWho(line)
      return (
        <>
          {back}
          <DishLineEditor
            title={line.item.name}
            units={[line.item.entered_unit]}
            portions={eaters}
            initialWho={who}
            initialAmount={who.kind === 'own' ? null : line.item.entered_amount}
            initialAmounts={line.amounts}
            confirmLabel="Save"
            build={(input) => rescaledLine(line, input)}
            onConfirm={addLine}
            secondaryAction={
              <Button
                variant="destructive"
                onClick={() => {
                  change(withoutLine(draft, line.id))
                  showMain()
                }}
              >
                Remove from dish
              </Button>
            }
          />
        </>
      )
    }
    case 'main':
      return (
        <>
          <GroupedSection>
            <TextField
              label="Dish name (optional)"
              defaultValue={draft.name ?? ''}
              onChange={(event) => change(withName(draft, event.target.value))}
            />
          </GroupedSection>
          <DishSplitSection
            dish={draft}
            people={people}
            date={date}
            nameOf={nameOf}
            onChange={change}
          />
          {draft.lines.length > 0 && (
            <GroupedSection header="Ingredients">
              {draft.lines.map((line) => (
                <ListRow
                  key={line.id}
                  title={line.item.name}
                  subtitle={describeLine(line, nameOf)}
                  detail={`${formatKcal(itemTotals(line.item).kcal)} kcal`}
                  onClick={() => setView({ kind: 'editLine', lineId: line.id })}
                />
              ))}
            </GroupedSection>
          )}
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setView({ kind: 'pick' })}>
              Add ingredient
            </Button>
          </div>
          {draft.lines.length > 0 && <DishTotals dish={draft} nameOf={nameOf} />}
          {error && <ErrorBanner message={error} />}
          <div className="mt-6">
            <Button onClick={save}>Save dish</Button>
          </div>
          {!isNew && (
            <div className="mt-3">
              <Button
                variant="destructive"
                onClick={() => {
                  deleteDish.remove(draft.id)
                  onDone()
                }}
              >
                Delete dish
              </Button>
            </div>
          )}
        </>
      )
  }
}
