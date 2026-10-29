const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** A copy of the list with one item moved; the target is held inside the list. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= list.length) {
    return next
  }
  const removed = next.splice(from, 1)
  next.splice(clamp(to, 0, list.length - 1), 0, ...removed)
  return next
}

/** The place a row dragged `offsetY` px from place `from` would take (equal row heights). */
export function targetIndex(
  from: number,
  offsetY: number,
  rowHeight: number,
  count: number,
): number {
  if (!(rowHeight > 0) || !(count > 0) || !Number.isFinite(offsetY)) return from
  return clamp(Math.round(from + offsetY / rowHeight), 0, count - 1)
}
