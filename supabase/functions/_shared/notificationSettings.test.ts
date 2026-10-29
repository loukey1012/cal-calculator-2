import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUMMARY_PARTS,
  minutesOf,
  parseNotificationSettings,
  SUMMARY_PART_IDS,
  SUMMARY_PART_LABELS,
  DEFAULT_WEEKLY_PARTS,
  WEEKLY_PART_LABELS,
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
      weekly: { ...DEFAULT_SETTINGS.weekly, on: false, time: '09:30' },
    })
  })

  test('settings saved before the weekly summary existed get its default', () => {
    const old = { partnerChanges: false, summary: { on: false, day: 'same', time: '22:00' } }

    expect(parseNotificationSettings(old).weekly).toEqual(DEFAULT_SETTINGS.weekly)
  })

  test('an invalid weekly time falls back to the default', () => {
    expect(parseNotificationSettings({ weekly: { on: false, time: '8am' } }).weekly).toEqual({
      ...DEFAULT_SETTINGS.weekly,
      on: false,
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

describe('weekly parts', () => {
  const partsOf = (parts: unknown) => parseNotificationSettings({ weekly: { parts } }).weekly.parts

  test('the default is saved, average and days within goal', () => {
    expect(DEFAULT_SETTINGS.weekly.parts.filter((part) => part.on).map((part) => part.id)).toEqual([
      'saved',
      'average',
      'withinGoal',
    ])
    expect(DEFAULT_SETTINGS.weekly.onlyWithGoal).toBe(false)
  })

  test('every part has an id once and a label, and never a weight', () => {
    const ids = DEFAULT_WEEKLY_PARTS.map((part) => part.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(WEEKLY_PART_LABELS).toSorted()).toEqual([...ids].toSorted())
    expect(ids.join()).not.toMatch(/weight/i)
  })

  test.each([undefined, null, 'x', 5, {}, []])('%j falls back to the defaults', (value) => {
    expect(partsOf(value)).toEqual(DEFAULT_WEEKLY_PARTS)
  })

  test('a saved order and on-state are kept, missing parts come last with their default', () => {
    const parts = partsOf([
      { id: 'salt', on: true },
      { id: 'saved', on: false },
      { id: 'weight', on: true },
      { id: 'salt', on: false },
    ])

    expect(parts.slice(0, 2)).toEqual([
      { id: 'salt', on: true },
      { id: 'saved', on: false },
    ])
    expect(parts).toHaveLength(DEFAULT_WEEKLY_PARTS.length)
    expect(parts.find((part) => part.id === 'average')?.on).toBe(true)
    expect(parts.find((part) => part.id === 'leftOut')?.on).toBe(false)
  })

  test('a huge array is read only as far as the known parts can reach', () => {
    const junk = Array.from({ length: 100_000 }, (_, index) => ({ id: `x${index}`, on: true }))
    const parts = partsOf([...junk, { id: 'salt', on: true }])

    // the late salt entry is beyond the bound, so salt keeps its default place and state
    expect(parts).toEqual(DEFAULT_WEEKLY_PARTS)
  })

  test('onlyWithGoal is kept, an invalid one falls back', () => {
    expect(parseNotificationSettings({ weekly: { onlyWithGoal: true } }).weekly.onlyWithGoal).toBe(
      true,
    )
    expect(parseNotificationSettings({ weekly: { onlyWithGoal: 1 } }).weekly.onlyWithGoal).toBe(
      false,
    )
  })
})
