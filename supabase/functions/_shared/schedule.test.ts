import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_WEEKLY_PARTS,
  type NotificationSettings,
  type WeeklyPartId,
} from './notificationSettings'
import { SAMPLE_DAY } from './summarySample'
import { type WeekFigures } from './weekSummary'
import {
  addDays,
  isDue,
  isRecentFinding,
  isUnsavedDue,
  localNow,
  partnerName,
  plannedByClock,
  reminderMessage,
  reviewMessage,
  summaryMessage,
  unsavedDishMessage,
  weeklyMessage,
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

  describe('the weekly summary', () => {
    const MONDAY = '2026-10-26'
    const weekly = (key: string, week: number, year = 2026) => ({
      kind: 'weekly',
      key,
      week: { year, week },
    })

    test('on Monday from its time on, about the week before', () => {
      expect(plannedByClock(DEFAULT_SETTINGS, at(MONDAY, '08:00'))).toContainEqual(
        weekly('2026-10-19', 43),
      )
      expect(plannedByClock(DEFAULT_SETTINGS, at(MONDAY, '09:55'))).toContainEqual(
        weekly('2026-10-19', 43),
      )
    })

    test('not before its time or when it is long past', () => {
      expect(
        plannedByClock(DEFAULT_SETTINGS, at(MONDAY, '07:59')).map((item) => item.kind),
      ).not.toContain('weekly')
      expect(
        plannedByClock(DEFAULT_SETTINGS, at(MONDAY, '10:00')).map((item) => item.kind),
      ).not.toContain('weekly')
    })

    test('not on any other weekday', () => {
      for (const date of [
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ]) {
        expect(
          plannedByClock(DEFAULT_SETTINGS, at(date, '08:00')).map((item) => item.kind),
        ).not.toContain('weekly')
      }
    })

    test('uses the chosen time and can be switched off', () => {
      const later: NotificationSettings = {
        ...DEFAULT_SETTINGS,
        weekly: { on: true, time: '18:30' },
      }
      const off: NotificationSettings = {
        ...DEFAULT_SETTINGS,
        weekly: { on: false, time: '08:00' },
      }

      expect(plannedByClock(later, at(MONDAY, '08:00')).map((item) => item.kind)).not.toContain(
        'weekly',
      )
      expect(plannedByClock(later, at(MONDAY, '18:31'))).toContainEqual(weekly('2026-10-19', 43))
      expect(plannedByClock(off, at(MONDAY, '08:00')).map((item) => item.kind)).not.toContain(
        'weekly',
      )
    })

    test('the first Monday of a year is about the last week of the year before', () => {
      expect(plannedByClock(DEFAULT_SETTINGS, at('2027-01-04', '08:00'))).toContainEqual(
        weekly('2026-12-28', 53),
      )
    })
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

describe('weeklyMessage', () => {
  const week = { year: 2026, week: 43 }
  const within = { within: 4, of: 5 }
  const figures = (extra: Partial<WeekFigures> = {}): WeekFigures => ({
    counted: 5,
    averageKcal: 1982,
    within,
    saved: 3090,
    burned: 14000,
    eaten: 10910,
    leftOut: 0,
    nutrients: {
      protein: { average: 121.2, goal: 140 },
      carbs: null,
      fat: { average: 60.4, goal: null },
      fiber: null,
      sugar: { average: 48, goal: null },
      salt: { average: 4.84, goal: null },
    },
    ...extra,
  })
  const only = (...ids: WeeklyPartId[]) => [
    ...ids.map((id) => ({ id, on: true })),
    ...DEFAULT_WEEKLY_PARTS.filter((part) => !ids.includes(part.id)).map(({ id }) => ({
      id,
      on: false,
    })),
  ]

  test('saved calories in the title, average and days within goal in the body', () => {
    expect(weeklyMessage(week, figures())).toEqual({
      title: 'Week 43: 3,090 kcal saved',
      body: 'Ø 1,982 kcal · 4 of 5 days within goal',
      url: '/history/week-2026-43',
      tag: 'weekly',
    })
  })

  test('the default parts give exactly the original wording', () => {
    expect(weeklyMessage(week, figures({ saved: 2100, averageKcal: 1930 }))).toEqual({
      title: 'Week 43: 2,100 kcal saved',
      body: 'Ø 1,930 kcal · 4 of 5 days within goal',
      url: '/history/week-2026-43',
      tag: 'weekly',
    })
    expect(
      weeklyMessage(week, figures({ saved: null, burned: null, eaten: null, averageKcal: 1930 })),
    ).toEqual({
      title: 'Week 43: Ø 1,930 kcal',
      body: '4 of 5 days within goal',
      url: '/history/week-2026-43',
      tag: 'weekly',
    })
    expect(weeklyMessage(week, figures({ saved: -1200, averageKcal: 2300 }))).toEqual({
      title: 'Week 43: 1,200 kcal surplus',
      body: 'Ø 2,300 kcal · 4 of 5 days within goal',
      url: '/history/week-2026-43',
      tag: 'weekly',
    })
  })

  test('salt is rounded to whole grams like the day summary', () => {
    const weekly = weeklyMessage(week, figures(), { parts: only('salt') })
    const day = summaryMessage({ ...SAMPLE_DAY, salt: 4.84 }, null, 'same', {
      parts: [{ id: 'salt', on: true }],
    })

    expect(weekly?.title).toBe('Week 43: Ø salt 5 g')
    expect(day.body).toBe('Salt 5 g')
  })

  test('a surplus is worded as one', () => {
    expect(weeklyMessage(week, figures({ saved: -1200 }))?.title).toBe(
      'Week 43: 1,200 kcal surplus',
    )
  })

  test('without calories burned the average moves to the title', () => {
    const message = weeklyMessage(week, figures({ saved: null, burned: null, eaten: null }))

    expect(message?.title).toBe('Week 43: Ø 1,982 kcal')
    expect(message?.body).toBe('4 of 5 days within goal')
  })

  test('one day within goal is worded in the singular, no goal leaves it out', () => {
    expect(weeklyMessage(week, figures({ saved: null, within: { within: 1, of: 1 } }))?.body).toBe(
      '1 of 1 day within goal',
    )
    const noGoal = weeklyMessage(week, figures({ within: null, saved: 100 }))
    expect(noGoal?.body).toBe('Ø 1,982 kcal')
    expect(
      weeklyMessage(week, figures({ within: null, saved: null }), { parts: only('saved') })?.body,
    ).toBeUndefined()
  })

  test('nothing to tell when no day counted, and never a weight', () => {
    expect(weeklyMessage(week, null)).toBeNull()
    expect(JSON.stringify(weeklyMessage(week, figures()))).not.toMatch(/kg/i)
  })

  test('the chosen parts in the chosen order: first in the title, the rest in the body', () => {
    const message = weeklyMessage(week, figures(), {
      parts: only('withinGoal', 'average', 'burnedEaten', 'leftOut'),
    })

    expect(message?.title).toBe('Week 43: 4 of 5 days within goal')
    expect(message?.body).toBe('Ø 1,982 kcal · Burned 14,000 · ate 10,910 kcal')
  })

  test('burned and eaten, and saved, are left out without a burned figure', () => {
    const message = weeklyMessage(week, figures({ saved: null, burned: null, eaten: null }), {
      parts: only('saved', 'burnedEaten', 'average'),
    })

    expect(message?.title).toBe('Week 43: Ø 1,982 kcal')
    expect(message?.body).toBeUndefined()
  })

  test('nutrient averages with a goal, without one, and salt in whole grams like the day summary', () => {
    const message = weeklyMessage(week, figures(), {
      parts: only('protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'),
    })

    expect(message?.title).toBe('Week 43: Ø protein 121 of 140 g')
    expect(message?.body).toBe('Ø fat 60 g · Ø sugar 48 g · Ø salt 5 g')
  })

  test('only with a goal hides the nutrients without one', () => {
    const message = weeklyMessage(week, figures(), {
      parts: only('protein', 'fat', 'sugar', 'salt', 'average'),
      onlyWithGoal: true,
    })

    expect(message?.title).toBe('Week 43: Ø protein 121 of 140 g')
    expect(message?.body).toBe('Ø 1,982 kcal')
  })

  test('days not counted, singular and none', () => {
    const parts = only('leftOut')

    expect(weeklyMessage(week, figures({ leftOut: 2 }), { parts })?.title).toBe(
      'Week 43: 2 days not counted',
    )
    expect(weeklyMessage(week, figures({ leftOut: 1 }), { parts })?.title).toBe(
      'Week 43: 1 day not counted',
    )
    expect(weeklyMessage(week, figures({ leftOut: 0 }), { parts })?.title).toBe('Week 43')
  })

  test('all parts off: just the week in the title, no body', () => {
    const message = weeklyMessage(week, figures(), { parts: only() })

    expect(message).toEqual({ title: 'Week 43', url: '/history/week-2026-43', tag: 'weekly' })
  })
})
