import type { DayStatus } from './calendar'

/** How each status colors a day, in the month calendar and the year overview alike. */
export const STATUS_CLASSES: Record<DayStatus, string> = {
  none: 'text-label',
  logged: 'bg-fill text-label',
  onTarget: 'bg-success/25 text-label',
  // the rings' over colors (Appearance), or red when those are switched off
  over: 'day-over text-label',
  wellOver: 'day-well-over text-label',
  // left out of the averages: an outline instead of a fill
  cheatDay: 'border-dashed border-label-secondary/60 text-label-secondary',
  // purple instead of grey, with a wine glass in the corner
  alcoholDay: 'border-dashed border-alcohol text-label-secondary',
  cheatMeal: 'bg-fill text-label',
  // not judged against the goal: it doesn't count until lunch and dinner are logged
  missing: 'bg-fill text-label',
}

/**
 * The same, for the small days of the year overview: a 1 px dashed outline is illegible at that
 * size, so the outlined days get a faint fill too, and the days the month marks with a symbol
 * (missing, cheat meal) a faint tint of their colors.
 */
export const MINI_STATUS_CLASSES: Record<DayStatus, string> = {
  ...STATUS_CLASSES,
  cheatDay: 'border-dashed border-label-secondary/60 bg-label/10 text-label-secondary',
  alcoholDay: 'border-dashed border-alcohol bg-alcohol/25 text-label-secondary',
  cheatMeal: 'bg-star/25 text-label',
  missing: 'bg-missing/25 text-label',
}

/** Cheat and alcohol days are outlined instead of filled; the caller sets the outline's width. */
export function isOutlined(status: DayStatus): boolean {
  return status === 'cheatDay' || status === 'alcoholDay'
}

/** What a screen reader adds to a day's date for its status. */
export const STATUS_TEXT: Record<DayStatus, string> = {
  none: '',
  logged: ', logged',
  onTarget: ', within goal',
  over: ', over goal',
  wellOver: ', well over goal',
  cheatDay: ', cheat day',
  alcoholDay: ', alcohol day',
  cheatMeal: ', cheat meal',
  missing: ', lunch or dinner missing',
}
