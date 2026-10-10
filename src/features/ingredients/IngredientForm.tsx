import { useState, type FormEvent, type ReactNode } from 'react'
import { InputRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import type { FieldErrors } from '../../lib/forms'
import { normalizeBarcode } from '../barcode/barcode'
import { BarcodeFillRow } from '../barcode/BarcodeFillRow'
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
import { UndoBar } from './UndoBar'
import { useIngredientFormState, type IngredientFormState } from './useIngredientFormState'
import { flaggedFields, valueWarnings } from './valueChecks'
import { ValueSources } from './ValueSources'
import { ValueWarnings } from './ValueWarnings'

const BASES: readonly BasisKey[] = ['per100g', 'perUnit']
const ENABLED_KEY = { per100g: 'per100gEnabled', perUnit: 'perUnitEnabled' } as const

type IngredientFormProps = {
  readonly formId: string
  readonly initialValues: IngredientFormValues
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly onSubmit: (data: ParsedIngredientForm) => void
  /** the household's ingredients, whose brands are suggested and whose values can be copied */
  readonly savedIngredients?: readonly Ingredient[]
  /** the portion as printed on the package of a scanned product, e.g. "3 Kekse (30 g)" */
  readonly packagePortion?: string | null
  /** a saved ingredient is edited (its barcode can be looked up again) */
  readonly editing?: boolean
}

export function IngredientForm({
  formId,
  initialValues,
  categories,
  groups,
  onSubmit,
  savedIngredients = [],
  packagePortion = null,
  editing = false,
}: IngredientFormProps) {
  const form = useIngredientFormState(initialValues, packagePortion)
  const { values } = form
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
    <form id={formId} noValidate onSubmit={handleSubmit}>
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
        savedIngredients={savedIngredients}
        onFill={form.fill}
        undo={undoAt('fill')}
      />
      <ValueWarnings warnings={warnings} />
      {BASES.map((basis) => (
        <BasisSection
          key={basis}
          title={basis === 'per100g' ? 'Per 100 g' : 'Per unit'}
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
      onSplit={form.splitPortion}
    />
  )
}

type DetailSectionsProps = {
  readonly form: IngredientFormState
  readonly errors: FieldErrors
  readonly flagged: ReadonlySet<string>
}

/** The unit, the estimate mark and the note. */
function DetailSections({ form, errors, flagged }: DetailSectionsProps) {
  const { values } = form
  return (
    <>
      <GroupedSection
        header="Unit"
        footer="Lets you log this ingredient in grams or in units. Calculate fills empty values: per 100 g or per unit from the other with the grams per unit, the grams per unit from both calories, and calories from protein, carbs and fat."
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
          label="Grams per unit"
          inputMode="decimal"
          placeholder="–"
          suffix="g"
          value={values.unitWeightG}
          onChange={(event) => form.set('unitWeightG', event.target.value)}
          onClear={() => form.set('unitWeightG', '')}
          flagged={flagged.has('unitWeightG')}
          error={errors.unitWeightG}
        />
        <CalculateRow values={values} onCalculated={form.replaceValues} />
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
