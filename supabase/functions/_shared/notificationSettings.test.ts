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
    }

    expect(parseNotificationSettings(chosen)).toEqual({
      partnerChanges: false,
      reminders: { ...DEFAULT_SETTINGS.reminders, lunch: { on: false, time: '13:30' } },
      summary: { on: true, day: 'same', time: '23:00' },
      unsavedDish: { on: false, afterMinutes: 60 },
      weeklyReview: false,
    })
  })

  test('invalid values fall back to the default', () => {
    const broken = {
      partnerChanges: 'yes',
      reminders: { dinner: { on: 1, time: '25:00' } },
      summary: { day: 'tomorrow', time: '8:00' },
      unsavedDish: { afterMinutes: 7 },
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
