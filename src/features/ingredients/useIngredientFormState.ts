import { useRef, useState } from 'react'
import type { ProductInfo } from '../barcode/openFoodFacts'
import {
  clearBasis,
  clearBasisField,
  fillEmptyFrom,
  filledCount,
  splitPerUnit,
  withNutritionOf,
} from './formActions'
import type { BasisField, BasisKey, IngredientFormValues } from './ingredientForm'
import { useUndo, type UndoOffer } from './useUndo'
import type { FilledValues } from './ValueSources'

/** What the form shows besides its values; undone together with them. */
type FormState = {
  readonly values: IngredientFormValues
  /** the portion as printed on a product's package, e.g. "3 Kekse (30 g)" */
  readonly packagePortion: string | null
  /** the per-unit values were split into smaller units already */
  readonly split: boolean
}

const BASIS_NAMES: Readonly<Record<BasisKey, string>> = {
  per100g: 'per 100 g',
  perUnit: 'per unit',
}

const valuesText = (count: number) => (count === 1 ? '1 value' : `${count} values`)

export type IngredientFormState = FormState & {
  readonly undoOffer: UndoOffer | null
  readonly undo: () => void
  readonly set: <K extends keyof IngredientFormValues>(
    key: K,
    value: IngredientFormValues[K],
  ) => void
  readonly setBasisValue: (basis: BasisKey, field: BasisField, value: string) => void
  readonly clearField: (basis: BasisKey, field: BasisField) => void
  /** e.g. Calculate, which only fills empty fields */
  readonly replaceValues: (values: IngredientFormValues) => void
  readonly clearAll: (basis: BasisKey) => void
  readonly splitPortion: (parts: number) => void
  readonly fill: (filled: FilledValues) => void
  /** fills in what's empty from a looked-up product; a message when nothing was */
  readonly fillFromProduct: (product: IngredientFormValues, info: ProductInfo) => string | null
}

/**
 * The ingredient form's values and its buttons' changes. Every change starts from the latest
 * state, so an answer arriving late (e.g. from Open Food Facts) never puts back older values.
 */
export function useIngredientFormState(
  initialValues: IngredientFormValues,
  initialPortion: string | null,
): IngredientFormState {
  const initial: FormState = { values: initialValues, packagePortion: initialPortion, split: false }
  const [state, setState] = useState(initial)
  const latest = useRef(initial)
  const commit = (next: FormState) => {
    latest.current = next
    setState(next)
  }
  const undo = useUndo<FormState>(commit)

  /** typing and small edits: an Undo offered before would revert them too */
  function edit(change: (values: IngredientFormValues) => IngredientFormValues) {
    undo.dismiss()
    commit({ ...latest.current, values: change(latest.current.values) })
  }

  /** a button's change, with an Undo next to it */
  function change(where: string, message: string, next: Partial<FormState>) {
    undo.offerUndo(where, message, latest.current)
    commit({ ...latest.current, ...next })
  }

  return {
    ...state,
    undoOffer: undo.offer,
    undo: undo.undo,
    set: (key, value) => edit((values) => ({ ...values, [key]: value })),
    setBasisValue: (basis, field, value) =>
      edit((values) => ({ ...values, [basis]: { ...values[basis], [field]: value } })),
    clearField: (basis, field) => edit((values) => clearBasisField(values, basis, field)),
    replaceValues: (values) => edit(() => values),
    clearAll: (basis) => {
      const { values } = latest.current
      const message = `Cleared ${valuesText(filledCount(values, basis))} ${BASIS_NAMES[basis]}`
      change(basis, message, { values: clearBasis(values, basis) })
    },
    splitPortion: (parts) =>
      change('split', `Split into ${parts} units`, {
        values: splitPerUnit(latest.current.values, parts),
        split: true,
      }),
    fill: ({ values: source, message, packagePortion }) =>
      change('fill', message, {
        values: withNutritionOf(latest.current.values, source),
        packagePortion,
        split: false,
      }),
    fillFromProduct: (product, info) => {
      const { values: next, count } = fillEmptyFrom(latest.current.values, product)
      if (count === 0) return 'Nothing to fill in: every value is already there.'
      change('barcode', `Filled in ${valuesText(count)}`, {
        values: next,
        packagePortion: latest.current.packagePortion ?? info.portion,
      })
      return null
    },
  }
}
