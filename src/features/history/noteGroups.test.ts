import { describe, expect, test } from 'vitest'
import { groupNotesByMonth, notesMatching } from './noteGroups'
import type { MonthNote } from './monthStats'

const NOTES: readonly MonthNote[] = [
  { date: '2026-10-12', mealType: null, text: 'Birthday at Oma’s' },
  { date: '2026-10-12', mealType: 'dinner', text: 'Käse pizza' },
  { date: '2026-09-30', mealType: 'lunch', text: 'Salad' },
  { date: '2026-08-02', mealType: null, text: 'Hike' },
]

describe('groupNotesByMonth', () => {
  test('groups notes under their month, keeping the order given', () => {
    expect(groupNotesByMonth(NOTES)).toEqual([
      { month: '2026-10-01', notes: [NOTES[0], NOTES[1]] },
      { month: '2026-09-01', notes: [NOTES[2]] },
      { month: '2026-08-01', notes: [NOTES[3]] },
    ])
  })

  test('gives no groups for no notes', () => {
    expect(groupNotesByMonth([])).toEqual([])
  })
})

describe('notesMatching', () => {
  test('finds text without regard to case or accents', () => {
    expect(notesMatching(NOTES, 'kase')).toEqual([NOTES[1]])
    expect(notesMatching(NOTES, 'OMA’S')).toEqual([NOTES[0]])
  })

  test('keeps everything for a blank query', () => {
    expect(notesMatching(NOTES, '')).toEqual(NOTES)
    expect(notesMatching(NOTES, '   ')).toEqual(NOTES)
  })

  test('finds nothing when nothing matches', () => {
    expect(notesMatching(NOTES, 'sushi')).toEqual([])
  })

  test('looks at the note text only, not at the meal name', () => {
    expect(notesMatching(NOTES, 'dinner')).toEqual([])
  })
})
