import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUMMARY_PARTS,
  minutesOf,
  parseNotificationSettings,
  SUMMARY_PART_IDS,
  SUMMARY_PART_LABELS,
} from './notificationSettings'

describe('parseNotificationSettings', () => {
  test('nothing saved yet: the defaults', () => {
    expect(parseNotificationSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(parseNotificationSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  test('keeps what was chosen', () => {
    const chosen = {
      partnerChanges: false,
      reminders: { lunch: { on: false, time: '13:30' } },
      summary: { on: true, day: 'same', time: '23:00' },
      unsavedDish: { on: false, afterMinutes: 60 },
      weeklyReview: false,
      weekly: { on: false, time: '09:30' },
    }

    expect(parseNotificationSettings(chosen)).toEqual({
      partnerChanges: false,
      reminders: { ...DEFAULT_SETTINGS.reminders, lunch: { on: false, time: '13:30' } },
      summary: { ...DEFAULT_SETTINGS.summary, on: true, day: 'same', time: '23:00' },
      unsavedDish: { on: false, afterMinutes: 60 },
      weeklyReview: false,
      weekly: { on: false, time: '09:30' },
    })
  })

  test('settings saved before the weekly summary existed get its default', () => {
    const old = { partnerChanges: false, summary: { on: false, day: 'same', time: '22:00' } }

    expect(parseNotificationSettings(old).weekly).toEqual({ on: true, time: '08:00' })
  })

  test('an invalid weekly time falls back to the default', () => {
    expect(parseNotificationSettings({ weekly: { on: false, time: '8am' } }).weekly).toEqual({
      on: false,
      time: '08:00',
    })
  })

  test('invalid values fall back to the default', () => {
    const broken = {
      partnerChanges: 'yes',
      reminders: { dinner: { on: 1, time: '25:00' } },
      summary: { day: 'tomorrow', time: '8:00' },
      unsavedDish: { afterMinutes: 7 },
      weekly: { on: 'sure', time: 800 },
    }

    expect(parseNotificationSettings(broken)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('summary parts', () => {
  const partsOf = (parts: unknown) =>
    parseNotificationSettings({ summary: { parts } }).summary.parts

  test('the default is today’s layout', () => {
    expect(DEFAULT_SETTINGS.summary.parts.filter((part) => part.on).map((part) => part.id)).toEqual(
      ['status', 'protein', 'carbs', 'fat'],
    )
    expect(DEFAULT_SETTINGS.summary.onlyWithGoal).toBe(false)
  })

  test('every part has an id once and a label', () => {
    expect(new Set(SUMMARY_PART_IDS).size).toBe(SUMMARY_PART_IDS.length)
    expect(Object.keys(SUMMARY_PART_LABELS).toSorted()).toEqual([...SUMMARY_PART_IDS].toSorted())
  })

  test.each([undefined, null, 'x', 5, {}, []])('%j falls back to the defaults', (value) => {
    expect(partsOf(value)).toEqual(DEFAULT_SUMMARY_PARTS)
  })

  test('settings saved before the parts existed get the defaults', () => {
    const old = { summary: { on: true, day: 'same', time: '22:00' } }

    expect(parseNotificationSettings(old).summary).toEqual({
      on: true,
      day: 'same',
      time: '22:00',
      parts: DEFAULT_SUMMARY_PARTS,
      onlyWithGoal: false,
    })
  })

  test('a saved order and on-state are kept, missing parts come last with their default', () => {
    const parts = partsOf([
      { id: 'salt', on: true },
      { id: 'protein', on: false },
      { id: 'calories', on: true },
    ])

    expect(parts.map((part) => part.id)).toEqual([
      'salt',
      'protein',
      'calories',
      ...SUMMARY_PART_IDS.filter((id) => !['salt', 'protein', 'calories'].includes(id)),
    ])
    expect(parts.slice(0, 3)).toEqual([
      { id: 'salt', on: true },
      { id: 'protein', on: false },
      { id: 'calories', on: true },
    ])
    expect(parts.find((part) => part.id === 'status')?.on).toBe(true)
    expect(parts.find((part) => part.id === 'fiber')?.on).toBe(false)
    expect(parts).toHaveLength(SUMMARY_PART_IDS.length)
  })

  test('unknown, duplicate and broken entries are dropped', () => {
    const parts = partsOf([
      { id: 'weight', on: true },
      { id: 'fat', on: false },
      { id: 'fat', on: true },
      null,
      'carbs',
      { id: 'carbs', on: 'yes' },
    ])

    expect(parts.slice(0, 2)).toEqual([
      { id: 'fat', on: false },
      { id: 'carbs', on: true },
    ])
    expect(parts.map((part) => part.id)).not.toContain('weight')
    expect(parts).toHaveLength(SUMMARY_PART_IDS.length)
  })

  test('onlyWithGoal is kept, an invalid one falls back', () => {
    expect(
      parseNotificationSettings({ summary: { onlyWithGoal: true } }).summary.onlyWithGoal,
    ).toBe(true)
    expect(parseNotificationSettings({ summary: { onlyWithGoal: 1 } }).summary.onlyWithGoal).toBe(
      false,
    )
  })
})

describe('minutesOf', () => {
  test.each([
    ['00:00', 0],
    ['08:30', 510],
    ['23:59', 1439],
  ])('%s → %i', (time, minutes) => {
    expect(minutesOf(time)).toBe(minutes)
  })
})
