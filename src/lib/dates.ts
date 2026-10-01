const pad = (value: number) => String(value).padStart(2, '0')

/** The local calendar day as YYYY-MM-DD (what meals.date stores), never the UTC day. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local midnight of a YYYY-MM-DD day. */
export function fromLocalDateString(day: string): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year, month - 1, dayOfMonth)
}

export function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return nextMidnight.getTime() - now.getTime()
}
