const WHOLE_NUMBER = /^\s*[1-9]\d*\s*$/

/** "1" and ½ make "1 1/2"; otherwise the fraction replaces what was typed. */
export function withFraction(current: string, fraction: string): string {
  return WHOLE_NUMBER.test(current) ? `${current.trim()} ${fraction}` : fraction
}
