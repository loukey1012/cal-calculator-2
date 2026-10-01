// digits with an optional "." or "," decimal part (the iOS German keypad types ",")
const DECIMAL_INPUT = /^\s*(?:\d+(?:[.,]\d*)?|[.,]\d+)\s*$/

/** Rounds half away from zero; the epsilon nudge fixes cases like 1.005 → 1.01. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor
}

/** Parses a non-negative decimal typed by the user; null when it isn't one. */
export function parseDecimal(input: string): number | null {
  if (!DECIMAL_INPUT.test(input)) return null
  return Number(input.trim().replace(',', '.'))
}
