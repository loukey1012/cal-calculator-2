import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS, minutesOf, parseNotificationSettings } from './notificationSettings'

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
      summary: { on: true, day: 'same', time: '23:00' },
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

describe('minutesOf', () => {
  test.each([
    ['00:00', 0],
    ['08:30', 510],
    ['23:59', 1439],
  ])('%s → %i', (time, minutes) => {
    expect(minutesOf(time)).toBe(minutes)
  })
})
