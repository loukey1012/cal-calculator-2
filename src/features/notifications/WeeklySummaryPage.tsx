import {
  WEEKLY_PART_LABELS,
  type WeeklyPartId,
} from '../../../supabase/functions/_shared/notificationSettings.ts'
import { weeklyPreview } from '../../../supabase/functions/_shared/summarySample.ts'
import { SummaryContentsPage, type ContentsKind } from './SummaryContentsPage'

const WEEKLY_SUMMARY: ContentsKind<WeeklyPartId> = {
  title: 'Weekly summary',
  caption: 'Example week',
  labels: WEEKLY_PART_LABELS,
  read: ({ weekly }) => weekly,
  write: (settings, change) => ({ ...settings, weekly: { ...settings.weekly, ...change } }),
  preview: ({ weekly }) => weeklyPreview(weekly),
}

/** Settings › Notifications › Weekly summary: what the Monday summary tells, and in which order. */
export function WeeklySummaryPage() {
  return <SummaryContentsPage kind={WEEKLY_SUMMARY} />
}
