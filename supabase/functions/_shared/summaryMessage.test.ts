import { describe, expect, test } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUMMARY_PARTS,
  SUMMARY_PART_IDS,
  DEFAULT_WEEKLY_PARTS,
  type SummaryPartId,
} from './notificationSettings'
import { summaryMessage, type DaySummary, type SummaryGoal } from './schedule'
import { SAMPLE_DAY, SAMPLE_GOAL, summaryPreview, weeklyPreview } from './summarySample'
import { weekSoFar, type WeekDayRow } from './weekSummary'

const DAY: DaySummary = {
  date: '2026-10-21',
  kcal: 1850,
  protein: 121.2,
  carbs: 200,
  fat: 60,
  fiber: 22,
  sugar: 48,
  salt: 4.8,
  mealCount: 4,
  cheatDay: false,
  cheatMeal: false,
  alcoholDay: false,
  kcalEstimated: false,
  lunchLogged: true,
  dinnerLogged: true,
}
const GOAL: SummaryGoal = { kcal: 2000, protein: 140, carbs: null, fat: 70, fiber: 30 }
const WEEK = { averageKcal: 1930, saved: 420 }

/** Only these parts, in this order. */
const only = (...ids: SummaryPartId[]) => [
  ...ids.map((id) => ({ id, on: true })),
  ...SUMMARY_PART_IDS.filter((id) => !ids.includes(id)).map((id) => ({ id, on: false })),
]
const bodyOf = (
  ids: SummaryPartId[],
  day: DaySummary = DAY,
  goal: SummaryGoal | null = GOAL,
  extra: { onlyWithGoal?: boolean; which?: 'previous' | 'same'; week?: typeof WEEK | null } = {},
) =>
  summaryMessage(day, goal, extra.which ?? 'previous', {
    parts: only(...ids),
    onlyWithGoal: extra.onlyWithGoal ?? false,
    week: extra.week ?? null,
  }).body

describe('summaryMessage parts', () => {
  test('the default parts are exactly the layout from before', () => {
    expect(summaryMessage(DAY, GOAL, 'previous', { parts: DEFAULT_SUMMARY_PARTS })).toEqual(
      summaryMessage(DAY, GOAL, 'previous'),
    )
    expect(summaryMessage(DAY, GOAL, 'previous').body).toBe(
      'Protein 121 of 140 g · Carbs 200 g · Fat 60 of 70 g',
    )
  })

  test('the title does not depend on the parts', () => {
    const message = summaryMessage(DAY, GOAL, 'same', { parts: only() })

    expect(message).toEqual({
      title: 'Today: 1850 of 2000 kcal',
      body: '',
      url: '/today',
      tag: 'summary',
    })
  })

  test('only the enabled parts, in the chosen order', () => {
    expect(bodyOf(['fat', 'status', 'protein'], { ...DAY, cheatDay: true })).toBe(
      'Fat 60 of 70 g · Cheat day · Protein 121 of 140 g',
    )
  })

  test('calories left, over, exactly on and without a goal', () => {
    expect(bodyOf(['calories'])).toBe('150 kcal left')
    expect(bodyOf(['calories'], { ...DAY, kcal: 2120 })).toBe('120 kcal over')
    expect(bodyOf(['calories'], { ...DAY, kcal: 2000 })).toBe('0 kcal left')
    expect(bodyOf(['calories'], DAY, null)).toBe('')
  })

  test('fiber, sugar and salt', () => {
    expect(bodyOf(['fiber', 'sugar', 'salt'])).toBe('Fiber 22 of 30 g · Sugar 48 g · Salt 5 g')
  })

  test('a nutrient without a value is left out', () => {
    expect(bodyOf(['protein', 'fiber'], { ...DAY, protein: null, fiber: undefined })).toBe('')
  })

  test('only with a goal hides nutrients without one, sugar and salt always', () => {
    const body = bodyOf(['protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'], DAY, GOAL, {
      onlyWithGoal: true,
    })

    expect(body).toBe('Protein 121 of 140 g · Fat 60 of 70 g · Fiber 22 of 30 g')
    expect(
      bodyOf(['protein', 'sugar'], DAY, { ...GOAL, protein: null }, { onlyWithGoal: true }),
    ).toBe('')
    expect(bodyOf(['protein'], DAY, null, { onlyWithGoal: true })).toBe('')
  })

  test('the status names the flag, cheat day first', () => {
    expect(bodyOf(['status'])).toBe('')
    expect(bodyOf(['status'], { ...DAY, alcoholDay: true })).toBe('Alcohol day')
    expect(bodyOf(['status'], { ...DAY, cheatMeal: true })).toBe('Cheat meal')
    expect(bodyOf(['status'], { ...DAY, cheatDay: true, cheatMeal: true })).toBe('Cheat day')
  })

  test('missing meals for a past day', () => {
    expect(bodyOf(['missingMeals'])).toBe('')
    expect(bodyOf(['missingMeals'], { ...DAY, dinnerLogged: false })).toBe('Dinner missing')
    expect(bodyOf(['missingMeals'], { ...DAY, lunchLogged: false })).toBe('Lunch missing')
    expect(bodyOf(['missingMeals'], { ...DAY, lunchLogged: false, dinnerLogged: false })).toBe(
      'Lunch and dinner missing',
    )
  })

  test('the same-evening summary judges its day as over, like the week parts do', () => {
    const missing = { ...DAY, dinnerLogged: false }

    expect(bodyOf(['missingMeals'], missing, GOAL, { which: 'same' })).toBe('Dinner missing')
  })

  test('no missing meals for a left-out day or before tracking', () => {
    const missing = { ...DAY, dinnerLogged: false }

    expect(bodyOf(['missingMeals'], { ...missing, cheatDay: true })).toBe('')
    expect(bodyOf(['missingMeals'], { ...missing, date: '2026-10-09' })).toBe('')
  })

  test('week parts: average and saved or surplus', () => {
    expect(bodyOf(['weekAverage', 'weekSaved'], DAY, GOAL, { week: WEEK })).toBe(
      'Week Ø 1,930 kcal · Week 420 kcal saved',
    )
    expect(bodyOf(['weekSaved'], DAY, GOAL, { week: { averageKcal: 2100, saved: -150 } })).toBe(
      'Week 150 kcal surplus',
    )
  })

  test('week parts are left out without counted days or a burned figure', () => {
    expect(bodyOf(['weekAverage', 'weekSaved'], DAY, GOAL, { week: null })).toBe('')
    expect(
      bodyOf(['weekAverage', 'weekSaved'], DAY, GOAL, { week: { averageKcal: 1930, saved: null } }),
    ).toBe('Week Ø 1,930 kcal')
  })

  test('every part together never mentions weight', () => {
    const message = summaryMessage(
      { ...DAY, alcoholDay: false, dinnerLogged: false },
      GOAL,
      'previous',
      { parts: SUMMARY_PART_IDS.map((id) => ({ id, on: true })), week: WEEK },
    )

    expect(`${message.title} ${message.body}`).not.toMatch(/kg|weight/i)
    expect(message.body).toContain('Dinner missing')
  })
})

describe('weekSoFar', () => {
  const row = (date: string, kcal: number, extra: Partial<WeekDayRow> = {}): WeekDayRow => ({
    date,
    kcal,
    mealCount: 3,
    lunchLogged: true,
    dinnerLogged: true,
    ...extra,
  })

  test('averages and saves over the counted days up to the summary day', () => {
    const days = [
      row('2026-10-19', 1800),
      row('2026-10-20', 2000),
      row('2026-10-21', 1900),
      row('2026-10-22', 5000),
    ]

    expect(weekSoFar(days, 2200, '2026-10-21')).toEqual({ averageKcal: 1900, saved: 900 })
  })

  test('cheat, alcohol, cheat meal and missing-meal days are left out', () => {
    const days = [
      row('2026-10-19', 1800),
      row('2026-10-20', 3500, { cheatDay: true }),
      row('2026-10-21', 3500, { alcoholDay: true }),
      row('2026-10-22', 3500, { cheatMeal: true }),
      row('2026-10-23', 3500, { dinnerLogged: false }),
      row('2026-10-24', 2000),
    ]

    expect(weekSoFar(days, 2200, '2026-10-24')).toEqual({ averageKcal: 1900, saved: 600 })
  })

  test('the summary day itself is left out when incomplete', () => {
    const days = [row('2026-10-19', 1800), row('2026-10-20', 900, { dinnerLogged: false })]

    expect(weekSoFar(days, null, '2026-10-20')).toEqual({ averageKcal: 1800, saved: null })
  })

  test('null when no day counted', () => {
    expect(weekSoFar([], 2200, '2026-10-21')).toBeNull()
    expect(weekSoFar([row('2026-10-19', 900, { cheatDay: true })], 2200, '2026-10-19')).toBeNull()
  })
})

describe('summaryPreview', () => {
  test('shows the sample day with the chosen parts', () => {
    const preview = summaryPreview({
      ...DEFAULT_SETTINGS.summary,
      parts: only('calories', 'missingMeals', 'weekAverage', 'weekSaved'),
    })

    expect(preview).toMatchObject({
      title: 'Yesterday: 1850 of 2000 kcal',
      body: '150 kcal left · Dinner missing · Week Ø 1,930 kcal · Week 420 kcal saved',
    })
    expect(SAMPLE_DAY.kcal).toBeLessThan(SAMPLE_GOAL.kcal)
  })

  test('the default settings preview today’s layout', () => {
    expect(summaryPreview(DEFAULT_SETTINGS.summary).body).toBe(
      'Protein 121 of 140 g · Carbs 200 of 220 g · Fat 62 of 70 g',
    )
  })
})

describe('weeklyPreview', () => {
  test('the default settings preview the default message for a sample week', () => {
    const preview = weeklyPreview(DEFAULT_SETTINGS.weekly)

    expect(preview.title).toMatch(/^Week \d+: [\d,]+ kcal saved$/)
    expect(preview.body).toMatch(/^Ø [\d,]+ kcal · \d of \d days within goal$/)
  })

  test('every part has something to show in the sample week', () => {
    const parts = DEFAULT_WEEKLY_PARTS.map(({ id }) => ({ id, on: true }))
    const preview = weeklyPreview({ ...DEFAULT_SETTINGS.weekly, parts })

    expect(preview.body).toContain('Burned')
    expect(preview.body).toContain('not counted')
    expect(preview.body).toContain('Ø salt')
    expect(preview.title).toContain('kcal saved')
  })
})
