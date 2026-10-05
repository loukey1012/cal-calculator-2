/** A chip's id and its rendered width in CSS px. */
export type ChipSize = { readonly key: string; readonly width: number }

// a handful of chips is searched exhaustively in microseconds; this caps pathological inputs
const MAX_SEARCH_STEPS = 50_000

/** How many rows flex-wrap needs for these widths in this order: each row filled before the next. */
export function countRows(widths: readonly number[], rowWidth: number, gap: number): number {
  let rows = 0
  let used = 0
  for (const width of widths) {
    if (rows > 0 && used + gap + width <= rowWidth) {
      used += gap + width
    } else {
      rows += 1
      used = width
    }
  }
  return rows
}

type Packing = { readonly rowOf: readonly number[] }

/**
 * Puts the chips into `rowCount` rows, the first chip fixed in row 0, or returns null. Bin
 * packing by depth-first search, biggest chips first. Each chip takes `width + gap` and a row
 * holds `rowWidth + gap`, which accounts for the gap between neighbours.
 */
function fitIntoRows(sizes: readonly number[], capacity: number, rowCount: number): Packing | null {
  const order = sizes
    .map((_, index) => index)
    .slice(1)
    .sort((a, b) => (sizes[b] ?? 0) - (sizes[a] ?? 0) || a - b)
  const loads = Array.from({ length: rowCount }, (_, row) => (row === 0 ? (sizes[0] ?? 0) : 0))
  const rowOf = sizes.map(() => 0)
  let steps = 0

  const place = (position: number): boolean => {
    if (position === order.length) return true
    if (++steps > MAX_SEARCH_STEPS) return false
    const chip = order[position] ?? 0
    const size = sizes[chip] ?? 0
    const triedLoads = new Set<number>()
    for (let row = 0; row < rowCount; row++) {
      const load = loads[row] ?? 0
      // rows with the same load are interchangeable: trying one of them is enough
      if (triedLoads.has(load)) continue
      triedLoads.add(load)
      // an empty row takes anything, even a chip wider than the screen
      if (load > 0 && load + size > capacity) continue
      loads[row] = load + size
      rowOf[chip] = row
      if (place(position + 1)) return true
      loads[row] = load
    }
    return false
  }

  return place(0) ? { rowOf } : null
}

/**
 * Rows in the order of their first chip (so row 0, holding the first chip, comes first), chips
 * within a row in their given order.
 */
function orderFromRows(keys: readonly string[], { rowOf }: Packing): readonly string[] {
  const rows = new Map<number, readonly string[]>()
  keys.forEach((key, index) => {
    const row = rowOf[index] ?? 0
    rows.set(row, [...(rows.get(row) ?? []), key])
  })
  return [...rows.values()].flat()
}

/**
 * An order for the chips that wraps into the fewest rows. The first chip ("All") stays first and
 * the given (alphabetical) order is kept wherever it doesn't cost a row.
 */
export function packChipOrder(
  chips: readonly ChipSize[],
  rowWidth: number,
  gap: number,
): readonly string[] {
  const keys = chips.map((chip) => chip.key)
  if (chips.length < 2 || rowWidth <= 0) return keys
  const given = countRows(
    chips.map((chip) => chip.width),
    rowWidth,
    gap,
  )
  const capacity = rowWidth + gap
  const sizes = chips.map((chip) => chip.width + gap)
  const total = sizes.reduce((sum, size) => sum + Math.min(size, capacity), 0)
  for (let rowCount = Math.max(1, Math.ceil(total / capacity)); rowCount < given; rowCount++) {
    const packing = fitIntoRows(sizes, capacity, rowCount)
    if (packing) return orderFromRows(keys, packing)
  }
  return keys
}
