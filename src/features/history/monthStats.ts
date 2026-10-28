import type { MealType } from '../meals/dayModel'
import type { DayStatus, DayTotal } from './calendar'

/** A note of the month: on the day itself (`mealType` null) or on one of its meals. */
export type MonthNote = {
  readonly date: string
  readonly mealType: MealType | null
  readonly text: string
}

export function noteDatesOf(notes: readonly MonthNote[]): ReadonlySet<string> {
  return new Set(notes.map((note) => note.date))
}

export type MonthFilter = 'notes' | 'alcohol' | 'cheat' | 'missing'

export const MONTH_FILTERS: ReadonlyArray<{ readonly value: MonthFilter; readonly label: string }> =
  [
    { value: 'notes', label: 'Notes' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'cheat', label: 'Cheat' },
    { value: 'missing', label: 'Missing' },
  ]

/** The filter kept in the navigation state; anything else reads as none. */
export function monthFilterOf(state: unknown): MonthFilter | null {
  if (typeof state !== 'object' || state === null || !('filter' in state)) return null
  return MONTH_FILTERS.find((option) => option.value === state.filter)?.value ?? null
}

/** Alcohol and cheat look at the day's flags: a status shows only one of them. */
export function filterMatches(
  filter: MonthFilter,
  status: DayStatus,
  hasNote: boolean,
  total?: DayTotal,
): boolean {
  switch (filter) {
    case 'notes':
      return hasNote
    case 'alcohol':
      return total?.alcoholDay === true
    case 'cheat':
      return total?.cheatDay === true || total?.cheatMeal === true
    case 'missing':
      return status === 'missing'
  }
}
