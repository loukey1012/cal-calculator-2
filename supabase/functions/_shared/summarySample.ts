import {
  summaryMessage,
  type DaySummary,
  type PushMessage,
  type SummaryGoal,
  type SummaryWeek,
} from './schedule.ts'
import { type NotificationSettings } from './notificationSettings.ts'

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
