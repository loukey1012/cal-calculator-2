import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { KeyboardNextButton } from '../../components/ios/KeyboardNextButton'
import { InputRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import type { FieldErrors } from '../../lib/forms'
import { normalizeBarcode } from '../barcode/barcode'
import { BarcodeFillRow } from '../barcode/BarcodeFillRow'
import type { Measure } from '../nutrition/types'
import { measureName, per100Name, unitChoiceLabel } from '../nutrition/unitNames'
import { withLabelValues } from '../label/labelForm'
import { BasisSection } from './BasisSection'
import { CalculateRow } from './CalculateRow'
import { IdentitySection } from './IdentitySection'
import {
  parseIngredientForm,
  type BasisKey,
  type IngredientFormValues,
  type ParsedIngredientForm,
} from './ingredientForm'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'
import { SplitPortionRow } from './SplitPortionRow'
import { clearIngredientDraft, loadIngredientDraft, saveIngredientDraft } from './ingredientDraft'
import { UndoBar } from './UndoBar'
import { useIngredientFormState, type IngredientFormState } from './useIngredientFormState'
import { flaggedFields, valueWarnings } from './valueChecks'
import { ValueSources } from './ValueSources'
import { ValueWarnings } from './ValueWarnings'

const BASES: readonly BasisKey[] = ['per100g', 'perUnit']
const ENABLED_KEY = { per100g: 'per100gEnabled', perUnit: 'perUnitEnabled' } as const
const MEASURES: readonly Measure[] = ['g', 'ml']

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

type IngredientFormProps = {
  readonly formId: string
  readonly initialValues: IngredientFormValues
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly onSubmit: (data: ParsedIngredientForm) => void
  /** the household's ingredients, whose brands are suggested */
  readonly savedIngredients?: readonly Ingredient[]
  /** the portion as printed on the package of a scanned product, e.g. "3 Kekse (30 g)" */
  readonly packagePortion?: string | null
  /** a saved ingredient is edited (its barcode can be looked up again) */
  readonly editing?: boolean
  /**
   * Keeps what's typed on the phone under this key (person and ingredient) until it's saved, so
   * a page closed by accident loses nothing; none: nothing is kept.
   */
  readonly draftKey?: string
}

/** The form, with what was typed before and not saved restored (and offered to discard). */
export function IngredientForm(props: IngredientFormProps) {
  const { draftKey, initialValues, onSubmit } = props
  const [restored, setRestored] = useState(() => (draftKey ? loadIngredientDraft(draftKey) : null))
  // a discarded draft starts the form over
  const [generation, setGeneration] = useState(0)
  const openedWith = JSON.stringify(initialValues)

  function keep(values: IngredientFormValues) {
    if (!draftKey) return
    // as it opened (nothing typed, or typed back): nothing to keep
    if (JSON.stringify(values) === openedWith) clearIngredientDraft(draftKey)
    else saveIngredientDraft(draftKey, values)
  }

  function discard() {
    if (draftKey) clearIngredientDraft(draftKey)
    setRestored(null)
    setGeneration((current) => current + 1)
  }

  return (
    <>
      {restored && (
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-bg-elevated py-1 pr-2 pl-4 shadow-card">
          <p role="status" className="flex-1 text-[15px] text-label-secondary">
            Restored what you typed before.
          </p>
          <Button variant="plain" onClick={discard}>
            Discard
          </Button>
        </div>
      )}
      <IngredientFormBody
        key={generation}
        {...props}
        initialValues={restored ?? initialValues}
        onValuesChange={keep}
        onSubmit={(data) => {
          if (draftKey) clearIngredientDraft(draftKey)
          onSubmit(data)
        }}
      />
    </>
  )
}

type IngredientFormBodyProps = IngredientFormProps & {
  readonly onValuesChange: (values: IngredientFormValues) => void
}

function IngredientFormBody({
  formId,
  initialValues,
  categories,
  groups,
  onSubmit,
  savedIngredients = [],
  packagePortion = null,
  editing = false,
  onValuesChange,
}: IngredientFormBodyProps) {
  const form = useIngredientFormState(initialValues, packagePortion)
  const { values } = form
  const formElement = useRef<HTMLFormElement>(null)
  // told once per change of the values (the callback itself is new on every render)
  const report = useRef(onValuesChange)
  useEffect(() => {
    report.current = onValuesChange
  })
  useEffect(() => report.current(values), [values])
  const [errors, setErrors] = useState<FieldErrors>({})
  const warnings = valueWarnings(values)
  const flagged = flaggedFields(warnings)
  const barcode = normalizeBarcode(values.barcode)
  // a new scanned product's form is already filled in from its barcode
  const offerBarcodeFill =
    barcode !== null && (editing || barcode !== normalizeBarcode(initialValues.barcode))

  const undoAt = (where: string) =>
    form.undoOffer?.where === where ? (
      <UndoBar message={form.undoOffer.message} onUndo={form.undo} />
    ) : undefined

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseIngredientForm(values)
    setErrors(result.success ? {} : result.errors)
    if (result.success) onSubmit(result.data)
  }

  return (
    <form ref={formElement} id={formId} noValidate onSubmit={handleSubmit}>
      <KeyboardNextButton container={formElement} />
      <IdentitySection
        values={values}
        errors={errors}
        categories={categories}
        groups={groups}
        savedIngredients={savedIngredients}
        onChange={form.set}
        barcodeAction={
          barcode !== null &&
          offerBarcodeFill &&
          (undoAt('barcode') ?? (
            <BarcodeFillRow key={barcode} barcode={barcode} onFound={form.fillFromProduct} />
          ))
        }
      />
      <ValueSources
        name={values.name}
        onFill={form.fill}
        onReadLabel={(reading) =>
          form.fill({
            values: withLabelValues(values, reading),
            message: `Read ${reading.found === 1 ? '1 value' : `${reading.found} values`} from the label. Check them against the package.`,
            packagePortion: form.packagePortion,
          })
        }
        undo={undoAt('fill')}
      />
      <ValueWarnings warnings={warnings} />
      <div className="mt-6">
        <SegmentedControl
          label="Measured in"
          options={MEASURES.map((measure) => ({ value: measure, label: unitChoiceLabel(measure) }))}
          value={values.measure}
          onChange={(measure) => form.set('measure', measure)}
        />
      </div>
      {BASES.map((basis) => (
        <BasisSection
          key={basis}
          title={basis === 'per100g' ? capitalized(per100Name(values.measure)) : 'Per unit'}
          basis={basis}
          enabled={values[ENABLED_KEY[basis]]}
          values={values[basis]}
          errors={errors}
          flagged={flagged}
          toggleError={basis === 'per100g' ? errors.per100gEnabled : undefined}
          onToggle={(enabled) => form.set(ENABLED_KEY[basis], enabled)}
          onChange={(field, value) => form.setBasisValue(basis, field, value)}
          onClearField={(field) => form.clearField(basis, field)}
          onClearAll={() => form.clearAll(basis)}
          undo={undoAt(basis)}
        >
          {basis === 'perUnit' && <SplitRow form={form} undo={undoAt('split')} />}
        </BasisSection>
      ))}
      <DetailSections form={form} errors={errors} flagged={flagged} />
    </form>
  )
}

type SplitRowProps = { readonly form: IngredientFormState; readonly undo: ReactNode }

function SplitRow({ form, undo }: SplitRowProps) {
  if (undo) return undo
  return (
    <SplitPortionRow
      key={`${form.packagePortion ?? ''}:${String(form.split)}`}
      packagePortion={form.packagePortion}
      // once split, the package's count isn't suggested again
      suggestCount={!form.split}
      measure={form.values.measure}
      onSplit={form.splitPortion}
    />
  )
}

type DetailSectionsProps = {
  readonly form: IngredientFormState
  readonly errors: FieldErrors
  readonly flagged: ReadonlySet<string>
}

/** The unit, the diet marks, the estimate mark and the note. */
function DetailSections({ form, errors, flagged }: DetailSectionsProps) {
  const { values } = form
  const amount = measureName(values.measure)
  const per100 = per100Name(values.measure)
  return (
    <>
      <GroupedSection
        header="Unit"
        footer={`Lets you log this ingredient in ${amount} or in units. Calculate fills empty values: ${per100} or per unit from the other with the ${amount} per unit, the ${amount} per unit from both calories, and calories from protein, carbs and fat.`}
      >
        <InputRow
          label="Unit name"
          placeholder="e.g. bar"
          value={values.unitLabel}
          onChange={(event) => form.set('unitLabel', event.target.value)}
          onClear={() => form.set('unitLabel', '')}
          error={errors.unitLabel}
        />
        <InputRow
          label={capitalized(`${amount} per unit`)}
          inputMode="decimal"
          placeholder="–"
          suffix={values.measure}
          value={values.unitWeightG}
          onChange={(event) => form.set('unitWeightG', event.target.value)}
          onClear={() => form.set('unitWeightG', '')}
          flagged={flagged.has('unitWeightG')}
          error={errors.unitWeightG}
        />
        <CalculateRow values={values} onCalculated={form.replaceValues} />
      </GroupedSection>
      <GroupedSection
        header="Diet"
        footer="Marks the ingredient in lists. A dish only gets a mark when all its ingredients have it."
      >
        <ToggleRow
          label="Vegan"
          checked={values.vegan}
          onChange={(vegan) => form.set('vegan', vegan)}
        />
        <ToggleRow
          label="Halal"
          checked={values.halal}
          onChange={(halal) => form.set('halal', halal)}
        />
      </GroupedSection>
      <GroupedSection footer="E.g. a restaurant dish you guessed. Dishes with it are marked as an estimate too.">
        <ToggleRow
          label="Values are an estimate"
          checked={values.kcalEstimated}
          onChange={(estimated) => form.set('kcalEstimated', estimated)}
        />
      </GroupedSection>
      <GroupedSection header="Note" footer={errors.note}>
        <textarea
          aria-label="Note"
          rows={3}
          value={values.note}
          onChange={(event) => form.set('note', event.target.value)}
          className="block w-full resize-none bg-transparent px-4 py-3 text-[17px] text-label outline-none"
        />
      </GroupedSection>
    </>
  )
}
