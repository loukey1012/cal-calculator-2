import { describe, expect, test } from 'vitest'
import { mealPageOf, mealPath } from '../meals/mealPages'
import { dayNotePageOf, dayNotePath, isNotePath, mealNotePath } from './notePages'

const USER = '0b8f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e'
const DAY = { userId: USER, date: '2026-10-21' }
const LUNCH = { ...DAY, mealType: 'lunch' } as const

describe('note pages', () => {
  test('a day note opens below Today, or below the History day it was opened from', () => {
    expect(dayNotePath(DAY, 'today')).toBe(`/today/note-2026-10-21-${USER}`)
    expect(dayNotePath(DAY, 'history')).toBe(`/history/2026-10-21/note-2026-10-21-${USER}`)
  })

  test('reads the day and the page Back leads to from the address', () => {
    expect(dayNotePageOf(dayNotePath(DAY, 'today'))).toEqual({ day: DAY, parentPath: '/today' })
    expect(dayNotePageOf(dayNotePath(DAY, 'history'))).toEqual({
      day: DAY,
      parentPath: '/history/2026-10-21',
    })
  })

  test('a person with special characters survives the round trip', () => {
    const odd = { userId: 'a b/c', date: '2026-10-21' }
    expect(dayNotePageOf(dayNotePath(odd, 'today'))?.day).toEqual(odd)
  })

  test('Today, History, meals and anything unknown are no day note page', () => {
    expect(dayNotePageOf('/today')).toBeNull()
    expect(dayNotePageOf('/history/2026-10-21')).toBeNull()
    expect(dayNotePageOf(`/history/note-2026-10-21-${USER}`)).toBeNull()
    expect(dayNotePageOf(`/today/2026-10-21/note-2026-10-21-${USER}`)).toBeNull()
    expect(dayNotePageOf(`/today/note-2026-10-21-${USER}/more`)).toBeNull()
    expect(dayNotePageOf(`/settings/note-2026-10-21-${USER}`)).toBeNull()
    expect(dayNotePageOf(mealPath(LUNCH, 'today'))).toBeNull()
    expect(dayNotePageOf('/today/note-oops')).toBeNull()
    expect(dayNotePageOf('/today/note-2026-10-21-%E0%A4%A')).toBeNull()
  })

  test('a meal note is the note page below its meal', () => {
    const today = mealPath(LUNCH, 'today')
    const history = mealPath(LUNCH, 'history')

    expect(mealNotePath(today)).toBe(`${today}/note`)
    expect(mealPageOf(mealNotePath(history))).toEqual({
      meal: LUNCH,
      mealPath: history,
      page: 'note',
      rest: [],
    })
  })

  test('recognises the addresses of note pages, and only those', () => {
    expect(isNotePath(dayNotePath(DAY, 'today'))).toBe(true)
    expect(isNotePath(dayNotePath(DAY, 'history'))).toBe(true)
    expect(isNotePath(mealNotePath(mealPath(LUNCH, 'today')))).toBe(true)
    expect(isNotePath(mealPath(LUNCH, 'today'))).toBe(false)
    expect(isNotePath('/today')).toBe(false)
  })
})
