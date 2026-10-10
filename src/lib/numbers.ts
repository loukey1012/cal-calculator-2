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

// "1/3" or "1 1/2" (a whole number, a space, then the fraction)
const FRACTION_INPUT = /^\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*$/

/** An amount typed as a decimal or a fraction ("1/3", "1 1/2"); null when it is neither. */
export function parseAmount(input: string): number | null {
  const decimal = parseDecimal(input)
  if (decimal !== null) return decimal
  const match = FRACTION_INPUT.exec(input)
  if (!match) return null
  const denominator = Number(match[3])
  if (denominator === 0) return null
  return Number(match[1] ?? 0) + Number(match[2]) / denominator
}
