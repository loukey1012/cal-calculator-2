import {
  summaryMessage,
  weeklyMessageOf,
  type DaySummary,
  type PushMessage,
  type SummaryGoal,
  type SummaryWeek,
} from './schedule.ts'
import { type NotificationSettings } from './notificationSettings.ts'
import { type WeekFigures } from './weekSummary.ts'

/**
 * A made-up day for the live preview in Settings › Notifications › Day summary. Dinner is
 * missing and the day has no flag, so the preview can show what each part looks like.
 */
export const SAMPLE_DAY: DaySummary = {
  date: '2026-10-20',
  kcal: 1850,
  protein: 121,
  carbs: 200,
  fat: 62,
  fiber: 22,
  sugar: 48,
  salt: 4.8,
  mealCount: 3,
  cheatDay: false,
  cheatMeal: false,
  alcoholDay: false,
  kcalEstimated: false,
  lunchLogged: true,
  dinnerLogged: false,
}

export const SAMPLE_GOAL: SummaryGoal = {
  kcal: 2000,
  protein: 140,
  carbs: 220,
  fat: 70,
  fiber: 30,
}

const SAMPLE_WEEK: SummaryWeek = { averageKcal: 1930, saved: 420 }

/** The notification these settings would send for the sample day. */
export function summaryPreview(settings: NotificationSettings['summary']): PushMessage {
  return summaryMessage(SAMPLE_DAY, SAMPLE_GOAL, settings.day, {
    parts: settings.parts,
    onlyWithGoal: settings.onlyWithGoal,
    week: SAMPLE_WEEK,
  })
}

/** A made-up week for the weekly summary's preview: six counted days, one left out. */
const SAMPLE_WEEK_FIGURES: WeekFigures = {
  counted: 6,
  averageKcal: 1930,
  within: { within: 5, of: 6 },
  saved: 2100,
  burned: 13680,
  eaten: 11580,
  leftOut: 1,
  nutrients: {
    protein: { average: 121, goal: 140 },
    carbs: { average: 205, goal: 220 },
    fat: { average: 64, goal: 70 },
    fiber: { average: 24, goal: 30 },
    sugar: { average: 46, goal: null },
    salt: { average: 4.6, goal: null },
  },
}

const SAMPLE_WEEK_NUMBER = { year: 2026, week: 43 }

/** The notification these settings would send for the sample week. */
export function weeklyPreview(settings: NotificationSettings['weekly']): PushMessage {
  return weeklyMessageOf(SAMPLE_WEEK_NUMBER, SAMPLE_WEEK_FIGURES, {
    parts: settings.parts,
    onlyWithGoal: settings.onlyWithGoal,
  })
}
