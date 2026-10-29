import {
  SUMMARY_PART_LABELS,
  type SummaryPartId,
} from '../../../supabase/functions/_shared/notificationSettings.ts'
import { summaryPreview } from '../../../supabase/functions/_shared/summarySample.ts'
import { SummaryContentsPage, type ContentsKind } from './SummaryContentsPage'

const DAY_SUMMARY: ContentsKind<SummaryPartId> = {
  title: 'Day summary',
  caption: 'Example day',
  labels: SUMMARY_PART_LABELS,
  read: ({ summary }) => summary,
  write: (settings, change) => ({ ...settings, summary: { ...settings.summary, ...change } }),
  preview: ({ summary }) => summaryPreview(summary),
}

/** Settings › Notifications › Day summary: what the summary tells, and in which order. */
export function DaySummaryPage() {
  return <SummaryContentsPage kind={DAY_SUMMARY} />
}
