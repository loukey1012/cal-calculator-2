import type { Ingredient } from '../ingredients/ingredientsApi'

/**
 * Package barcodes (GTINs): EAN-8, UPC-A, EAN-13 and ITF-14. UPC-A is stored as its EAN-13 form
 * (a leading 0), so a package matches however a scanner reports it.
 */

const GTIN_LENGTHS = new Set([8, 12, 13, 14])
const UPC_A_LENGTH = 12
// what people type or scanners add between digit groups
const SEPARATORS = /[\s-]/g

/** GS1 check digit: weights 3 and 1 from the right, excluding the check digit itself. */
function hasValidCheckDigit(digits: string): boolean {
  const body = digits.slice(0, -1)
  const sum = [...body].reverse().reduce((total, digit, index) => {
    const weight = index % 2 === 0 ? 3 : 1
    return total + Number(digit) * weight
  }, 0)
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1))
}

/** The barcode as stored, or null when it isn't a valid package barcode. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(SEPARATORS, '')
  if (!/^\d+$/.test(digits) || !GTIN_LENGTHS.has(digits.length)) return null
  if (!hasValidCheckDigit(digits)) return null
  return digits.length === UPC_A_LENGTH ? `0${digits}` : digits
}

export function findByBarcode(
  ingredients: readonly Ingredient[],
  barcode: string,
): Ingredient | null {
  return ingredients.find((ingredient) => ingredient.barcode === barcode) ?? null
}
