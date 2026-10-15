import { describe, expect, test } from 'vitest'
import { groupByDay, PATCH_NOTES, type PatchNote } from './patchNotes'

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

describe('PATCH_NOTES', () => {
  test('every entry has a date and hour, a kind and a title', () => {
    for (const note of PATCH_NOTES) {
      expect(note.at).toMatch(TIMESTAMP)
      expect(['new', 'fix', 'internal']).toContain(note.kind)
      expect(note.title.trim()).not.toBe('')
    }
  })

  test('are newest first', () => {
    const times = PATCH_NOTES.map(({ at }) => at)
    expect(times).toEqual(times.toSorted().reverse())
  })

  test('start with the history so far', () => {
    expect(PATCH_NOTES.length).toBeGreaterThan(100)
  })
})

describe('groupByDay', () => {
  test('puts the entries of one day together, keeping their order', () => {
    const notes: PatchNote[] = [
      { at: '2026-10-15T20:34', kind: 'new', title: 'Liquid Glass' },
      { at: '2026-10-15T09:10', kind: 'fix', title: 'Nutrient order' },
      { at: '2026-10-14T18:00', kind: 'internal', title: 'Tests' },
    ]

    expect(groupByDay(notes)).toEqual([
      { day: '2026-10-15', notes: notes.slice(0, 2) },
      { day: '2026-10-14', notes: notes.slice(2) },
    ])
  })
})
