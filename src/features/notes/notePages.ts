/**
 * The addresses of the note pages. A day's note is a page of the tab it was opened from:
 * /today/note-2026-10-21-<person> or /history/2026-10-21/note-2026-10-21-<person>. A meal's note is
 * below its meal page (<meal page>/note, see meals/mealPages.ts). Back leads one level up.
 */

import { mealPageOf, NOTE_SEGMENT } from '../meals/mealPages'

/** mirrors the database checks on day_notes.note and meals.note */
export const NOTE_MAX_LENGTH = 500

export type DayNoteRef = {
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
}

export type DayNotePage = {
  readonly day: DayNoteRef
  /** the page Back leads to: Today, or the History day the note was opened from */
  readonly parentPath: string
}

const DAY_NOTE_SEGMENT = /^note-(\d{4}-\d{2}-\d{2})-(.+)$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Where a day's note opens: below the History day it was opened from, else below Today. */
export function dayNotePath(day: DayNoteRef, from: 'today' | 'history'): string {
  const segment = `note-${day.date}-${encodeURIComponent(day.userId)}`
  return from === 'history' ? `/history/${day.date}/${segment}` : `/today/${segment}`
}

/** Where a meal's note opens: one level below its meal page. */
export function mealNotePath(mealPagePath: string): string {
  return `${mealPagePath}/${NOTE_SEGMENT}`
}

/** The day note page an address shows, or null for anything else. */
export function dayNotePageOf(path: string): DayNotePage | null {
  const segments = path.split('/').filter((segment) => segment !== '')
  const [tab, second, third] = segments
  const belowDay = tab === 'history' && second !== undefined && DAY.test(second)
  const wanted = belowDay ? 3 : 2
  if ((tab !== 'today' && !belowDay) || segments.length !== wanted) return null
  const match = DAY_NOTE_SEGMENT.exec((belowDay ? third : second) ?? '')
  if (!match) return null
  const [, date = '', person = ''] = match
  try {
    return {
      day: { userId: decodeURIComponent(person), date },
      parentPath: `/${segments.slice(0, wanted - 1).join('/')}`,
    }
  } catch {
    return null
  }
}

/** True for the address of any note page, a day's or a meal's. */
export function isNotePath(path: string): boolean {
  return dayNotePageOf(path) !== null || mealPageOf(path)?.page === 'note'
}
