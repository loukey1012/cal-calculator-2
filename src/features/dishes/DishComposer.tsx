import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { useIngredients } from '../ingredients/hooks'
import { NewIngredientForm } from '../ingredients/NewIngredientForm'
import { CustomItemForm } from '../meals/CustomItemForm'
import { FoodPicker } from '../meals/FoodPicker'
import { availableUnits } from '../nutrition/amounts'
import { formatKcal } from '../nutrition/format'
import { ingredientNutrition, ingredientSource } from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'
import {
  describeLine,
  estimatedLineNames,
  lineWho,
  newId,
  rescaledLine,
  withAddedLine,
  withKcalEstimated,
  withName,
  withoutLine,
} from './dishDraft'
import { DishLineEditor, type PortionOption } from './DishLineEditor'
import { DishSplitSection } from './DishSplitSection'
import { DishTotals } from './DishTotals'
import { LeftoverStepper } from './LeftoverStepper'
import { stepKey, type ComposerStep, type ComposerSteps } from './composerSteps'
import { buildDishLine, type Dish, type DishLine } from './portions'

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
  /** which step is shown, and moving between them */
  readonly steps: ComposerSteps
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
  steps,
}: DishComposerProps) {
  const top = useRef<HTMLDivElement>(null)
  const { step } = steps
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const estimatedIds = new Set(
    (ingredients.data ?? []).flatMap((ingredient) =>
      ingredient.kcal_estimated ? [ingredient.id] : [],
    ),
  )
  const estimatedNames = estimatedLineNames(dish, estimatedIds)
  // a long form may be scrolled down; every step starts at its top
  const shownStep = useRef(stepKey(step))
  useEffect(() => {
    if (shownStep.current === stepKey(step)) return
    shownStep.current = stepKey(step)
    top.current?.scrollIntoView?.({ block: 'start' })
  }, [step])
  // own amounts can go to leftovers too, e.g. noodles for tomorrow
  const portions: PortionOption[] = dish.portions.flatMap((portion) =>
    portion.discarded ? [] : [{ id: portion.id, name: nameOf(portion.id) }],
  )

  return (
    <div ref={top} className="scroll-mt-4">
      {step.kind === 'main' ? (
        <>
          {header}
          <GroupedSection header="Ingredients">
            {dish.lines.map((line) => (
              <ListRow
                key={line.id}
                title={line.item.name}
                subtitle={describeLine(line, nameOf)}
                detail={`${formatKcal(itemTotals(line.item).kcal)} kcal`}
                onClick={() => steps.open({ kind: 'editLine', lineId: line.id })}
              />
            ))}
            <div className="px-2 py-1">
              <Button variant="plain" onClick={() => steps.open({ kind: 'pick' })}>
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
            {/* e.g. eaten out: the calories count in full but show as approximate */}
            <ToggleRow
              label="Calories are an estimate"
              checked={dish.kcalEstimated ?? false}
              onChange={(estimated) => onChange(withKcalEstimated(dish, estimated))}
            />
            {estimatedNames.length > 0 && (
              <p className="px-4 pb-3 text-[13px] text-label-secondary">
                {estimatedNoteText(estimatedNames)}
              </p>
            )}
            <LeftoverStepper dish={dish} onChange={onChange} />
          </GroupedSection>
          {dish.lines.length > 0 && <DishTotals dish={dish} nameOf={nameOf} />}
          {error && <ErrorBanner message={error} />}
          <div className="mt-6 flex flex-col gap-3">{actions}</div>
        </>
      ) : (
        <StepView
          step={step}
          steps={steps}
          dish={dish}
          portions={portions}
          onAdd={(line) => {
            onChange(withAddedLine(dish, line, estimatedIds))
            steps.finish()
          }}
          onChange={(next) => {
            onChange(next)
            steps.finish()
          }}
        />
      )}
    </div>
  )
}

function estimatedNoteText(names: readonly string[]): string {
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${list} ${names.length === 1 ? 'is' : 'are'} marked as an estimate.`
}

type StepViewProps = {
  readonly step: Exclude<ComposerStep, { kind: 'main' }>
  readonly steps: ComposerSteps
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly onAdd: (line: DishLine) => void
  /** a change that ends the step, e.g. removing the line */
  readonly onChange: (dish: Dish) => void
}

function StepView({ step, steps, dish, portions, onAdd, onChange }: StepViewProps) {
  switch (step.kind) {
    case 'pick':
      return (
        <FoodPicker
          filter={steps.filter}
          onFilterChange={steps.onFilter}
          onPick={(ingredient) => steps.open({ kind: 'newLine', ingredientId: ingredient.id })}
          onNew={(barcode) =>
            steps.open({ kind: 'newIngredient', ...(barcode ? { barcode } : {}) })
          }
          onCustom={() => steps.open({ kind: 'custom' })}
        />
      )
    case 'newIngredient':
      return (
        <NewIngredientForm
          initialName={steps.filter.query}
          barcode={step.barcode ?? null}
          // on to its amount; Back from there leads to the search, not to this form
          onSaved={(ingredient) => steps.replace({ kind: 'newLine', ingredientId: ingredient.id })}
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
    case 'newLine':
      return <NewLineStep ingredientId={step.ingredientId} portions={portions} onAdd={onAdd} />
    case 'editLine':
      return (
        <EditLineStep
          lineId={step.lineId}
          dish={dish}
          portions={portions}
          onSave={onAdd}
          onChange={onChange}
        />
      )
  }
}

function Message({ text }: { readonly text: string }) {
  return <p className="mt-6 text-center text-[15px] text-label-secondary">{text}</p>
}

type NewLineStepProps = {
  readonly ingredientId: string
  readonly portions: readonly PortionOption[]
  readonly onAdd: (line: DishLine) => void
}

/** The amount of a picked ingredient. */
function NewLineStep({ ingredientId, portions, onAdd }: NewLineStepProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  // one id for the line while its amount is entered
  const [lineId] = useState(newId)
  if (ingredients.isError) return <ErrorBanner message={toUserMessage(ingredients.error)} />
  if (ingredients.isPending) return <Message text="Loading…" />
  const ingredient = ingredients.data.find((candidate) => candidate.id === ingredientId)
  if (!ingredient) return <Message text="This ingredient is no longer available." />
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

type EditLineStepProps = {
  readonly lineId: string
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly onSave: (line: DishLine) => void
  readonly onChange: (dish: Dish) => void
}

/** One line of the dish: its amounts, or removing it. */
function EditLineStep({ lineId, dish, portions, onSave, onChange }: EditLineStepProps) {
  const current = dish.lines.find((candidate) => candidate.id === lineId)
  // a removed line stays on screen while its page slides away
  const [opened] = useState(current)
  const line = current ?? opened
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
      onConfirm={onSave}
      secondaryAction={
        <Button variant="destructive" onClick={() => onChange(withoutLine(dish, line.id))}>
          Remove from dish
        </Button>
      }
    />
  )
}
