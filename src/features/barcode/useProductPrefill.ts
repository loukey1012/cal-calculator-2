import { useQuery } from '@tanstack/react-query'
import type { IngredientFormValues } from '../ingredients/ingredientForm'
import { lookupProduct, type ProductInfo, type ProductLookup } from './openFoodFacts'

export type ProductPrefill =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready'
      readonly values: IngredientFormValues
      readonly note: string
      readonly warnings: readonly string[]
      /** what the package says; null when the product wasn't found */
      readonly info: ProductInfo | null
    }

const NOTES: Readonly<Record<ProductLookup['kind'], string>> = {
  found: 'Filled in from Open Food Facts. Check the values against the package before saving.',
  notFound: 'This product isn’t in Open Food Facts yet. Fill in the values from the package.',
  unavailable: 'Couldn’t look the product up right now. Fill in the values from the package.',
}

/**
 * A new ingredient's form for a scanned barcode, filled in from Open Food Facts where possible.
 * null without a barcode. `fallback` is used for whatever the lookup can't fill in.
 */
export function useProductPrefill(
  barcode: string | null,
  fallback: IngredientFormValues,
): ProductPrefill | null {
  const lookup = useQuery({
    queryKey: ['openFoodFacts', barcode],
    queryFn: () => lookupProduct(barcode ?? ''),
    enabled: barcode !== null,
    // lookupProduct never fails and gives up after a few seconds, also offline
    networkMode: 'always',
    retry: false,
    gcTime: 0,
    // a stored "couldn't look it up" must not come back after a restart
    meta: { persist: false },
  })
  if (barcode === null) return null
  if (!lookup.data) return { status: 'loading' }
  const result = lookup.data
  const values =
    result.kind === 'found'
      ? { ...result.values, name: result.values.name || fallback.name }
      : { ...fallback, barcode }
  const found = result.kind === 'found'
  return {
    status: 'ready',
    values,
    note: NOTES[result.kind],
    warnings: found ? result.warnings : [],
    info: found ? result.info : null,
  }
}
