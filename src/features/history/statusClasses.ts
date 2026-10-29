import type { DayStatus } from './calendar'

const LEFT_OUT = 'bg-fill text-label-secondary'

/** How each status colors a day, in the month calendar and the year overview alike. */
export const STATUS_CLASSES: Record<DayStatus, string> = {
  none: 'text-label',
  logged: 'bg-fill text-label',
  onTarget: 'bg-success/25 text-label',
  // the rings' over colors (Appearance), or red when those are switched off
  over: 'day-over text-label',
  wellOver: 'day-well-over text-label',
  // a day that doesn't count: the same plain grey card whatever the reason; only the corner
  // mark (LeftOutMark) says why
  cheatDay: LEFT_OUT,
  alcoholDay: LEFT_OUT,
  cheatMeal: LEFT_OUT,
  // not judged against the goal: it doesn't count until lunch and dinner are logged
  missing: LEFT_OUT,
}

/**
 * The same, for the small days of the year overview: they have no corner marks, so the days that
 * don't count get a faint tint of their reason's color (cheat day and cheat meal share the cheat
 * color, as they share the fork and knife).
 */
export const MINI_STATUS_CLASSES: Record<DayStatus, string> = {
  ...STATUS_CLASSES,
  cheatDay: 'bg-cheat/25 text-label-secondary',
  alcoholDay: 'bg-alcohol/25 text-label-secondary',
  cheatMeal: 'bg-cheat/25 text-label-secondary',
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
