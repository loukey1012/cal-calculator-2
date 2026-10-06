import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { TextField } from '../../components/ios/TextField'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { CustomItemForm } from '../meals/CustomItemForm'
import { FoodPicker } from '../meals/FoodPicker'
import { availableUnits } from '../nutrition/amounts'
import { formatKcal } from '../nutrition/format'
import { ingredientNutrition, ingredientSource } from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'
import {
  describeLine,
  lineWho,
  newId,
  rescaledLine,
  withLine,
  withName,
  withoutLine,
} from './dishDraft'
import { DishLineEditor, type PortionOption } from './DishLineEditor'
import { DishSplitSection } from './DishSplitSection'
import { DishTotals } from './DishTotals'
import { LeftoverStepper } from './LeftoverStepper'
import { buildDishLine, type Dish, type DishLine } from './portions'

type View =
  | { readonly kind: 'main' }
  | { readonly kind: 'pick' }
  | { readonly kind: 'custom' }
  | { readonly kind: 'newLine'; readonly ingredient: Ingredient; readonly lineId: string }
  | { readonly kind: 'editLine'; readonly lineId: string }

type DishComposerProps = {
  readonly dish: Dish
  readonly onChange: (dish: Dish) => void
  /** e.g. "Lukas", "Leftover" */
  readonly nameOf: (portionId: string) => string
  /** top of the form: who eats and when */
  readonly header: ReactNode
  /** below the totals, e.g. save and delete */
  readonly actions: ReactNode
  readonly error: string | null
}

/**
 * Puts a dish together: its ingredients (each shared, only for one person or with own amounts),
 * the split, name and leftovers, and what everyone gets. Used to cook a new dish on the Cook
 * tab and to edit a saved one from a meal.
 */
export function DishComposer({
  dish,
  onChange,
  nameOf,
  header,
  actions,
  error,
}: DishComposerProps) {
  const [view, setView] = useState<View>({ kind: 'main' })
  const top = useRef<HTMLDivElement>(null)
  // a long form may be scrolled down; every step starts at its top
  const show = (next: View) => {
    setView(next)
    top.current?.scrollIntoView?.({ block: 'start' })
  }
  const showMain = () => show({ kind: 'main' })
  // own amounts can go to leftovers too, e.g. noodles for tomorrow
  const portions: PortionOption[] = dish.portions.flatMap((portion) =>
    portion.discarded ? [] : [{ id: portion.id, name: nameOf(portion.id) }],
  )
  const addLine = (line: DishLine) => {
    onChange(withLine(dish, line))
    showMain()
  }
  const back = (
    <Button variant="plain" aria-label="Back" className="-ml-2" onClick={showMain}>
      ‹ Back
    </Button>
  )

  return (
    <div ref={top} className="scroll-mt-4">
      {view.kind === 'main' ? (
        <>
          {header}
          <GroupedSection header="Ingredients">
            {dish.lines.map((line) => (
              <ListRow
                key={line.id}
                title={line.item.name}
                subtitle={describeLine(line, nameOf)}
                detail={`${formatKcal(itemTotals(line.item).kcal)} kcal`}
                onClick={() => show({ kind: 'editLine', lineId: line.id })}
              />
            ))}
            <div className="px-2 py-1">
              <Button variant="plain" onClick={() => show({ kind: 'pick' })}>
                Add ingredient
              </Button>
            </div>
          </GroupedSection>
          <DishSplitSection dish={dish} nameOf={nameOf} onChange={onChange} />
          <GroupedSection header="Details">
            <TextField
              label="Dish name (optional)"
              defaultValue={dish.name ?? ''}
              onChange={(event) => onChange(withName(dish, event.target.value))}
            />
            <LeftoverStepper dish={dish} onChange={onChange} />
          </GroupedSection>
          {dish.lines.length > 0 && <DishTotals dish={dish} nameOf={nameOf} />}
          {error && <ErrorBanner message={error} />}
          <div className="mt-6 flex flex-col gap-3">{actions}</div>
        </>
      ) : (
        <>
          {back}
          <SubView
            view={view}
            dish={dish}
            portions={portions}
            onAdd={addLine}
            onShow={show}
            onChange={(next) => {
              onChange(next)
              showMain()
            }}
          />
        </>
      )}
    </div>
  )
}

type SubViewProps = {
  readonly view: Exclude<View, { kind: 'main' }>
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly onAdd: (line: DishLine) => void
  readonly onShow: (view: View) => void
  /** a change that ends the step, e.g. removing the line */
  readonly onChange: (dish: Dish) => void
}

function SubView({ view, dish, portions, onAdd, onShow, onChange }: SubViewProps) {
  switch (view.kind) {
    case 'pick':
      return (
        <FoodPicker
          onPick={(ingredient) => onShow({ kind: 'newLine', ingredient, lineId: newId() })}
          onCustom={() => onShow({ kind: 'custom' })}
        />
      )
    case 'custom':
      return (
        <CustomItemForm
          confirmLabel="Add to dish"
          onConfirm={({ source, amount, unit }) =>
            onAdd(buildDishLine({ id: newId(), source, unit, allocation: 'shared', amount }))
          }
        />
      )
    case 'newLine': {
      const { ingredient, lineId } = view
      return (
        <DishLineEditor
          title={ingredient.name}
          units={availableUnits(ingredientNutrition(ingredient))}
          unitLabel={ingredient.unit_label}
          portions={portions}
          confirmLabel="Add to dish"
          build={(input) =>
            buildDishLine({ ...input, id: lineId, source: ingredientSource(ingredient) })
          }
          onConfirm={onAdd}
        />
      )
    }
    case 'editLine': {
      const line = dish.lines.find((candidate) => candidate.id === view.lineId)
      if (!line) return null
      const who = lineWho(line)
      return (
        <DishLineEditor
          title={line.item.name}
          units={[line.item.entered_unit]}
          portions={portions}
          initialWho={who}
          initialAmount={who.kind === 'own' ? null : line.item.entered_amount}
          initialAmounts={line.amounts}
          confirmLabel="Save"
          build={(input) => rescaledLine(line, input)}
          onConfirm={onAdd}
          secondaryAction={
            <Button variant="destructive" onClick={() => onChange(withoutLine(dish, line.id))}>
              Remove from dish
            </Button>
          }
        />
      )
    }
  }
}
