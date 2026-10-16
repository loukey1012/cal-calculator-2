/**
 * CSV as Excel and Numbers open it with Austrian settings: semicolons between fields, decimal
 * commas, CRLF line ends, and a byte-order mark so umlauts come out right.
 */
export type CsvValue = string | number | boolean | null

const BOM = '﻿'
const SEPARATOR = ';'
const LINE_END = '\r\n'
// a leading = + - @ would be run as a formula by spreadsheet apps
const FORMULA_START = /^[=+\-@]/

function field(value: CsvValue): string {
  if (value === null || value === false) return ''
  if (value === true) return 'yes'
  if (typeof value === 'number') return String(value).replace('.', ',')
  const text = FORMULA_START.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(header: readonly string[], rows: ReadonlyArray<readonly CsvValue[]>): string {
  const lines = [header, ...rows].map((row) => row.map(field).join(SEPARATOR))
  return BOM + lines.map((line) => line + LINE_END).join('')
}
