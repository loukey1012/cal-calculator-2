import { searchable } from '../ingredients/listing'
import { monthStart } from './calendar'
import type { MonthNote } from './monthStats'

export type NoteGroup = { readonly month: string; readonly notes: readonly MonthNote[] }

/** The notes under the month (YYYY-MM-01) of their day; groups and notes keep the given order. */
export function groupNotesByMonth(notes: readonly MonthNote[]): NoteGroup[] {
  const groups: NoteGroup[] = []
  for (const note of notes) {
    const month = monthStart(note.date)
    const last = groups.at(-1)
    if (last?.month === month) groups[groups.length - 1] = { month, notes: [...last.notes, note] }
    else groups.push({ month, notes: [note] })
  }
  return groups
}

/** The notes whose text contains the query, whatever the case or accents; blank keeps all. */
export function notesMatching(notes: readonly MonthNote[], query: string): readonly MonthNote[] {
  const wanted = searchable(query.trim())
  if (wanted === '') return notes
  return notes.filter((note) => searchable(note.text).includes(wanted))
}
