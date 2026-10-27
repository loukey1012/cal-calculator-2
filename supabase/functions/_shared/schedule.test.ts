import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS, type NotificationSettings } from './notificationSettings'
import {
  addDays,
  isDue,
  isQuiet,
  isRecentFinding,
  isUnsavedDue,
  localNow,
  partnerChangeMessage,
  partnerName,
  plannedByClock,
  reminderMessage,
  reviewMessage,
  summaryMessage,
  unsavedDishMessage,
  type DaySummary,
} from './schedule'

const at = (date: string, time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return { date, minutes: hours * 60 + minutes }
}

describe('localNow', () => {
  test('the time where the person is (Vienna in summer is UTC+2)', () => {
    expect(localNow(new Date('2026-10-20T22:30:00Z'), 'Europe/Vienna')).toEqual(
      at('2026-10-21', '00:30'),
    )
  })

  test('an unknown time zone falls back to Vienna', () => {
    expect(localNow(new Date('2026-10-20T10:00:00Z'), 'Mars/Olympus')).toEqual(
      at('2026-10-20', '12:00'),
    )
  })

  test('no time zone saved yet: Vienna', () => {
    expect(localNow(new Date('2026-12-20T10:00:00Z'), null)).toEqual(at('2026-12-20', '11:00'))
  })
})

describe('addDays', () => {
  test.each([
    ['2026-10-20', -1, '2026-10-19'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-12-31', 1, '2027-01-01'],
  ])('%s %i → %s', (date, days, result) => {
    expect(addDays(date, days)).toBe(result)
  })
})

describe('isDue', () => {
  test.each([
    ['13:59', false],
    ['14:00', true],
    ['15:59', true],
    ['16:00', false],
  ])('a 14:00 reminder at %s: %s', (time, due) => {
    expect(isDue('14:00', at('2026-10-20', time))).toBe(due)
  })
})

describe('plannedByClock', () => {
  test('a meal reminder from its time on', () => {
    expect(plannedByClock(DEFAULT_SETTINGS, at('2026-10-20', '14:05'))).toEqual([
      { kind: 'reminder', key: '2026-10-20:lunch', meal: 'lunch', date: '2026-10-20' },
    ])
  })

  test('the summary the next morning is about the day before', () => {
    expect(plannedByClock(DEFAULT_SETTINGS, at('2026-10-20', '08:00'))).toEqual([
      { kind: 'summary', key: '2026-10-19', date: '2026-10-19' },
    ])
  })

  test('a summary the same evening is about that day', () => {
    const settings: NotificationSettings = {
      ...DEFAULT_SETTINGS,
      summary: { on: true, day: 'same', time: '23:00' },
    }

    expect(plannedByClock(settings, at('2026-10-20', '23:10'))).toEqual([
      { kind: 'summary', key: '2026-10-20', date: '2026-10-20' },
    ])
  })

  test('switched off: nothing', () => {
    const settings: NotificationSettings = {
      ...DEFAULT_SETTINGS,
      reminders: { ...DEFAULT_SETTINGS.reminders, lunch: { on: false, time: '14:00' } },
    }

    expect(plannedByClock(settings, at('2026-10-20', '14:05'))).toEqual([])
  })
})

describe('messages', () => {
  test('a reminder opens that meal (through the old Cook link)', () => {
    expect(reminderMessage('u1', 'lunch', '2026-10-20')).toEqual({
      title: 'Lunch',
      body: 'Nothing logged for lunch yet.',
      url: '/cook?person=u1&date=2026-10-20&meal=lunch&from=%2Ftoday',
      tag: 'reminder:lunch',
    })
  })

  const DAY: DaySummary = {
    date: '2026-10-19',
    kcal: 1849.6,
    protein: 121.2,
    carbs: 200,
    fat: null,
    mealCount: 4,
    cheatDay: false,
    cheatMeal: false,
    alcoholDay: false,
    kcalEstimated: false,
  }

  test('the summary compares with the goal and opens the day', () => {
    const goal = { kcal: 2000, protein: 140, carbs: null, fat: 70 }

    expect(summaryMessage(DAY, goal, 'previous')).toEqual({
      title: 'Yesterday: 1850 of 2000 kcal',
      body: 'Protein 121 of 140 g · Carbs 200 g',
      url: '/history/2026-10-19',
      tag: 'summary',
    })
  })

  test('an alcohol day is named too', () => {
    const message = summaryMessage({ ...DAY, alcoholDay: true }, null, 'previous')

    expect(message.body).toContain('Alcohol day')
  })

  test('without a goal, an estimate and a cheat day', () => {
    const message = summaryMessage(
      { ...DAY, kcalEstimated: true, cheatDay: true, protein: null, carbs: null },
      null,
      'same',
    )

    expect(message).toMatchObject({ title: 'Today: ~1850 kcal', body: 'Cheat day', url: '/today' })
  })

  test('partner changes are grouped by day, newest first, meals in order', () => {
    const message = partnerChangeMessage(
      'baby',
      [
        { date: '2026-10-20', mealType: 'dinner' },
        { date: '2026-10-17', mealType: 'snack' },
        { date: '2026-10-20', mealType: 'lunch' },
        { date: '2026-10-19', mealType: 'breakfast' },
      ],
      '2026-10-20',
    )

    expect(message).toEqual({
      title: 'baby changed your meals',
      body: 'Today: Lunch, Dinner · Yesterday: Breakfast · Sat 17 Oct: Snacks',
      url: '/today',
      tag: 'partner',
    })
  })

  test('changes only on a past day open that day', () => {
    const message = partnerChangeMessage(
      'Lisa',
      [{ date: '2026-10-18', mealType: 'lunch' }],
      '2026-10-20',
    )

    expect(message.url).toBe('/history/2026-10-18')
  })
})

describe('partnerName', () => {
  test('my nickname for them, else "baby"', () => {
    const appearance = { partnerLooks: { u2: { nickname: 'Schatz' } } }

    expect(partnerName(appearance, 'u2')).toBe('Schatz')
    expect(partnerName(appearance, 'u3')).toBe('baby')
    expect(partnerName(null, 'u2')).toBe('baby')
    expect(partnerName({ partnerLooks: { u2: { nickname: ' ' } } }, 'u2')).toBe('baby')
  })
})

describe('isQuiet', () => {
  const now = new Date('2026-10-20T12:10:00Z')

  test('told once 3 minutes passed without a new change', () => {
    expect(isQuiet(['2026-10-20T12:00:00Z', '2026-10-20T12:07:00Z'], now)).toBe(true)
    expect(isQuiet(['2026-10-20T12:00:00Z', '2026-10-20T12:08:00Z'], now)).toBe(false)
    expect(isQuiet([], now)).toBe(false)
  })
})

describe('unsaved dish', () => {
  const now = new Date('2026-10-20T12:30:00Z')

  test('due once it waited the chosen minutes', () => {
    expect(isUnsavedDue('2026-10-20T12:00:00Z', 30, now)).toBe(true)
    expect(isUnsavedDue('2026-10-20T12:01:00Z', 30, now)).toBe(false)
  })

  test('the notice names the dish and opens its meal (through the old Cook link)', () => {
    expect(unsavedDishMessage('Chili')).toEqual({
      title: 'Not logged yet',
      body: 'Chili is still waiting to be logged.',
      url: '/cook',
      tag: 'unsaved',
    })
  })
})

describe('weekly review', () => {
  test('only findings of the last 3 days are told', () => {
    const now = new Date('2026-10-20T12:00:00Z')

    expect(isRecentFinding('2026-10-18T08:00:00Z', now)).toBe(true)
    expect(isRecentFinding('2026-10-17T11:00:00Z', now)).toBe(false)
  })

  test('says how many things to check', () => {
    expect(reviewMessage(1).body).toBe('1 thing to check.')
    expect(reviewMessage(4)).toEqual({
      title: 'Weekly review',
      body: '4 things to check.',
      url: '/ingredients',
      tag: 'review',
    })
  })
})
