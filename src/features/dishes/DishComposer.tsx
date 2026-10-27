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
import type { Ingredient } from '../ingredients/ingredientsApi'
import { useReferenceTable } from '../ingredients/useReferenceTable'
import { NewIngredientForm } from '../ingredients/NewIngredientForm'
import { CustomItemForm } from '../meals/CustomItemForm'
import { FoodPicker } from '../meals/FoodPicker'
import { availableUnits } from '../nutrition/amounts'
import { formatKcal } from '../nutrition/format'
import { ingredientNutrition, ingredientSource } from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'
import {
  describeLine,
  hasRoomForEntry,
  estimatedLineNames,
  lineWho,
  newId,
  rescaledLine,
  swappedLine,
  withAddedLine,
  withKcalEstimated,
  withName,
  withoutLine,
  withoutToWeigh,
  withSwappedLine,
  withToWeigh,
  withWeighedLine,
} from './dishDraft'
import { DishLineEditor, type PortionOption } from './DishLineEditor'
import { CompactDish } from './CompactDish'
import { DishSplitSection } from './DishSplitSection'
import { DishTotals } from './DishTotals'
import { LeftoverStepper } from './LeftoverStepper'
import { NO_FILTER, stepKey, type ComposerStep, type ComposerSteps } from './composerSteps'
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
  /** a logged dish: amounts changed in place, the rest only when opened (`header` goes there) */
  readonly compact?: boolean
  /** Add food: a new ingredient may be put in the dish without an amount (never for a saved dish) */
  readonly allowWeighLater?: boolean
}

/**
 * Puts a dish together: its ingredients (each shared, only for one person or with own amounts),
 * the split, name and leftovers, and what everyone gets. Used to put a new dish together in
 * Add food and to edit a saved one from a meal.
 */
export function DishComposer({
  dish,
  onChange,
  nameOf,
  header,
  actions,
  error,
  steps,
  compact = false,
  allowWeighLater = false,
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
  const waiting = dish.toWeigh ?? []
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
      {step.kind === 'main' && compact && (
        <CompactDish
          dish={dish}
          onChange={onChange}
          nameOf={nameOf}
          whoEats={header}
          estimateNote={estimatedNames.length > 0 ? estimatedNoteText(estimatedNames) : null}
          actions={actions}
          error={error}
          steps={steps}
        />
      )}
      {step.kind === 'main' && !compact && (
        <>
          {header}
          <GroupedSection
            header="Ingredients"
            footer={waiting.length > 0 ? 'Weigh these before saving the meal.' : null}
          >
            {dish.lines.map((line) => (
              <ListRow
                key={line.id}
                title={line.item.name}
                subtitle={describeLine(line, nameOf)}
                detail={`${formatKcal(itemTotals(line.item).kcal)} kcal`}
                onClick={() => steps.open({ kind: 'editLine', lineId: line.id })}
              />
            ))}
            {waiting.map((item) => {
              // the ingredient's name today, else the one it had when it was put in the dish
              const name =
                ingredients.data?.find((candidate) => candidate.id === item.ingredientId)?.name ??
                item.name
              return (
                <ListRow
                  key={item.id}
                  title={name}
                  detail="To weigh"
                  accentDetail
                  ariaLabel={`${name}, to weigh`}
                  onClick={() => steps.open({ kind: 'weighLine', itemId: item.id })}
                />
              )
            })}
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
      )}
      {step.kind !== 'main' && (
        <StepView
          step={step}
          steps={steps}
          dish={dish}
          portions={portions}
          estimatedIds={estimatedIds}
          allowWeighLater={allowWeighLater && !compact && hasRoomForEntry(dish)}
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
  /** ingredients marked as an estimate: one swapped in marks the dish */
  readonly estimatedIds: ReadonlySet<string>
  readonly allowWeighLater: boolean
  readonly onAdd: (line: DishLine) => void
  /** a change that ends the step, e.g. removing the line */
  readonly onChange: (dish: Dish) => void
}

function StepView({
  step,
  steps,
  dish,
  portions,
  estimatedIds,
  allowWeighLater,
  onAdd,
  onChange,
}: StepViewProps) {
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
      return (
        <NewLineStep
          ingredientId={step.ingredientId}
          portions={portions}
          onAdd={onAdd}
          onWeighLater={
            allowWeighLater
              ? (ingredient, itemId) =>
                  onChange(
                    withToWeigh(dish, {
                      id: itemId,
                      ingredientId: ingredient.id,
                      name: ingredient.name,
                    }),
                  )
              : undefined
          }
        />
      )
    case 'weighLine':
      return (
        <WeighLineStep
          itemId={step.itemId}
          dish={dish}
          portions={portions}
          onWeighed={(line) => onChange(withWeighedLine(dish, step.itemId, line, estimatedIds))}
          onRemove={() => onChange(withoutToWeigh(dish, step.itemId))}
        />
      )
    case 'editLine':
      return (
        <EditLineStep
          lineId={step.lineId}
          dish={dish}
          portions={portions}
          steps={steps}
          onSave={onAdd}
          onChange={onChange}
        />
      )
    case 'swap':
    case 'swapLine':
      return (
        <SwapStep
          step={step}
          steps={steps}
          dish={dish}
          portions={portions}
          onSwap={(line) => onChange(withSwappedLine(dish, line, estimatedIds))}
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
  /** puts the ingredient in the dish without an amount; missing where that isn't allowed */
  readonly onWeighLater?: (ingredient: Ingredient, itemId: string) => void
}

/** The amount of a picked ingredient. */
function NewLineStep({ ingredientId, portions, onAdd, onWeighLater }: NewLineStepProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  // one id for the line while its amount is entered
  const [lineId] = useState(newId)
  // and one for the placeholder, so a second tap on Weigh later can't add it twice
  const [itemId] = useState(newId)
  const ingredient = ingredients.data?.find((candidate) => candidate.id === ingredientId)
  const reference = useReferenceTable(ingredient)
  if (ingredients.isError) return <ErrorBanner message={toUserMessage(ingredients.error)} />
  if (ingredients.isPending) return <Message text="Loading…" />
  if (!ingredient) return <Message text="This ingredient is no longer available." />
  return (
    <DishLineEditor
      title={ingredient.name}
      reference={reference}
      units={availableUnits(ingredientNutrition(ingredient))}
      unitLabel={ingredient.unit_label}
      portions={portions}
      confirmLabel="Add to dish"
      build={(input) =>
        buildDishLine({ ...input, id: lineId, source: ingredientSource(ingredient) })
      }
      onConfirm={onAdd}
      secondaryAction={
        onWeighLater && (
          <Button variant="secondary" onClick={() => onWeighLater(ingredient, itemId)}>
            Weigh later
          </Button>
        )
      }
    />
  )
}

type WeighLineStepProps = {
  readonly itemId: string
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly onWeighed: (line: DishLine) => void
  readonly onRemove: () => void
}

/** The amount (and who) of an ingredient put in the dish without one. */
function WeighLineStep({ itemId, dish, portions, onWeighed, onRemove }: WeighLineStepProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const current = dish.toWeigh?.find((candidate) => candidate.id === itemId)
  // a weighed or removed item stays on screen while its page slides away
  const [opened] = useState(current)
  const item = current ?? opened
  const ingredient = ingredients.data?.find((candidate) => candidate.id === item?.ingredientId)
  const reference = useReferenceTable(ingredient)
  // one id for the line while its amount is entered
  const [lineId] = useState(newId)
  if (!item) return <Message text="This ingredient is no longer in the dish." />
  const remove = (
    <Button variant="destructive" onClick={onRemove}>
      Remove from dish
    </Button>
  )
  // without the ingredients (still loading, or offline) the placeholder can still be removed
  if (ingredients.isError || ingredients.isPending || !ingredient) {
    return (
      <>
        {ingredients.isError ? (
          <ErrorBanner message={toUserMessage(ingredients.error)} />
        ) : (
          <Message
            text={ingredients.isPending ? 'Loading…' : 'This ingredient is no longer available.'}
          />
        )}
        <div className="mt-6">{remove}</div>
      </>
    )
  }
  return (
    <DishLineEditor
      title={ingredient.name}
      reference={reference}
      units={availableUnits(ingredientNutrition(ingredient))}
      unitLabel={ingredient.unit_label}
      portions={portions}
      confirmLabel="Add to dish"
      build={(input) =>
        buildDishLine({ ...input, id: lineId, source: ingredientSource(ingredient) })
      }
      onConfirm={onWeighed}
      secondaryAction={remove}
    />
  )
}

type EditLineStepProps = {
  readonly lineId: string
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly steps: ComposerSteps
  readonly onSave: (line: DishLine) => void
  readonly onChange: (dish: Dish) => void
}

/** One line of the dish: its amounts, another product, or removing it. */
function EditLineStep({ lineId, dish, portions, steps, onSave, onChange }: EditLineStepProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const current = dish.lines.find((candidate) => candidate.id === lineId)
  // a removed line stays on screen while its page slides away
  const [opened] = useState(current)
  const line = current ?? opened
  const reference = useReferenceTable(
    ingredients.data?.find((candidate) => candidate.id === line?.item.ingredient_id),
  )
  if (!line) return null
  const who = lineWho(line)
  return (
    <DishLineEditor
      title={line.item.name}
      reference={reference}
      units={[line.item.entered_unit]}
      portions={portions}
      initialWho={who}
      initialAmount={who.kind === 'own' ? null : line.item.entered_amount}
      initialAmounts={line.amounts}
      confirmLabel="Save"
      build={(input) => rescaledLine(line, input)}
      onConfirm={onSave}
      secondaryAction={
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              // the search starts in the product's category, e.g. Cheese
              const categoryId = ingredients.data?.find(
                (candidate) => candidate.id === line.item.ingredient_id,
              )?.category_id
              steps.onFilter(
                categoryId
                  ? { ...NO_FILTER, category: { kind: 'category', id: categoryId } }
                  : NO_FILTER,
              )
              steps.open({ kind: 'swap', lineId: line.id })
            }}
          >
            Swap ingredient
          </Button>
          <Button variant="destructive" onClick={() => onChange(withoutLine(dish, line.id))}>
            Remove from dish
          </Button>
        </div>
      }
    />
  )
}

type SwapStepProps = {
  readonly step: Extract<ComposerStep, { kind: 'swap' | 'swapLine' }>
  readonly steps: ComposerSteps
  readonly dish: Dish
  readonly portions: readonly PortionOption[]
  readonly onSwap: (line: DishLine) => void
}

/**
 * Another product for a line: picked in the search, it takes the line's place with the same
 * amounts and people; if it can't be measured that way, its amount is asked for first.
 */
function SwapStep({ step, steps, dish, portions, onSwap }: SwapStepProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const current = dish.lines.find((candidate) => candidate.id === step.lineId)
  // a swapped line stays on screen while its page slides away
  const [opened] = useState(current)
  const line = current ?? opened
  const picked = step.kind === 'swapLine' ? step.ingredientId : null
  const ingredient = ingredients.data?.find((candidate) => candidate.id === picked)
  const reference = useReferenceTable(ingredient)
  if (!line) return <Message text="This ingredient is no longer in the dish." />

  if (step.kind === 'swap') {
    return (
      <FoodPicker
        filter={steps.filter}
        onFilterChange={steps.onFilter}
        onPick={(ingredient) => {
          const swapped = swappedLine(line, ingredientSource(ingredient))
          if (swapped) onSwap(swapped)
          else steps.open({ kind: 'swapLine', lineId: line.id, ingredientId: ingredient.id })
        }}
      />
    )
  }
  if (ingredients.isError) return <ErrorBanner message={toUserMessage(ingredients.error)} />
  if (ingredients.isPending) return <Message text="Loading…" />
  if (!ingredient) return <Message text="This ingredient is no longer available." />
  const who = lineWho(line)
  return (
    <DishLineEditor
      title={ingredient.name}
      reference={reference}
      units={availableUnits(ingredientNutrition(ingredient))}
      unitLabel={ingredient.unit_label}
      portions={portions}
      initialWho={who}
      confirmLabel={`Use instead of ${line.item.name}`}
      build={(input) =>
        buildDishLine({ ...input, id: line.id, source: ingredientSource(ingredient) })
      }
      onConfirm={onSwap}
    />
  )
}
