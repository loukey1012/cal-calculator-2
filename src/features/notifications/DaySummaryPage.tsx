import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ReorderList } from '../../components/ios/ReorderList'
import { useCurrentUser } from '../../app/currentUser'
import { toUserMessage } from '../../lib/errors'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import {
  SUMMARY_PART_LABELS,
  type NotificationSettings,
  type SummaryPart,
} from '../../../supabase/functions/_shared/notificationSettings.ts'
import { summaryPreview } from '../../../supabase/functions/_shared/summarySample.ts'
import { usePreferences, useSavePreferences } from './hooks'
import { NOTIFICATIONS_PATH } from './paths'
import { deviceTimeZone, type Preferences } from './preferencesApi'

/** How the notification looks on the lock screen, for the example day. */
function NotificationPreview({ summary }: { readonly summary: NotificationSettings['summary'] }) {
  const { title, body } = summaryPreview(summary)
  return (
    <div className="mt-4">
      <div
        role="group"
        aria-label="Notification preview"
        className="glass-surface flex gap-3 rounded-3xl bg-bg-elevated p-3 shadow-card"
      >
        <div
          aria-hidden="true"
          className="mt-0.5 h-9 w-9 shrink-0 rounded-[10px] bg-accent text-center text-[17px] leading-9 font-extrabold text-on-accent"
        >
          C
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-wide text-label-secondary uppercase">
            CALculator
          </p>
          <p className="text-[15px] font-semibold">{title}</p>
          {body && (
            <p data-testid="preview-body" className="text-[15px]">
              {body}
            </p>
          )}
        </div>
      </div>
      <p className="px-4 pt-2 text-center text-[13px] text-label-secondary">Example day</p>
    </div>
  )
}

type Summary = NotificationSettings['summary']
type Loaded = Preferences

/** The two settings this page changes. */
type SummaryChange = Pick<Summary, 'parts' | 'onlyWithGoal'>

function DaySummaryForm({
  loaded,
  onSave,
}: {
  readonly loaded: Loaded
  readonly onSave: (next: Loaded) => void
}) {
  const { settings } = loaded
  // each change is saved at once, like everywhere on the Notifications pages
  const change = (summary: Partial<SummaryChange>) =>
    onSave({
      settings: { ...settings, summary: { ...settings.summary, ...summary } },
      timeZone: deviceTimeZone() ?? loaded.timeZone,
    })
  const toggle = (part: SummaryPart, on: boolean) =>
    change({ parts: settings.summary.parts.map((p) => (p.id === part.id ? { ...p, on } : p)) })

  return (
    <>
      <NotificationPreview summary={settings.summary} />
      <GroupedSection header="Shown in the notification">
        <ReorderList
          items={settings.summary.parts}
          getKey={(part) => part.id}
          getLabel={(part) => SUMMARY_PART_LABELS[part.id]}
          renderRow={(part) => (
            <ToggleRow
              label={SUMMARY_PART_LABELS[part.id]}
              checked={part.on}
              onChange={(on) => toggle(part, on)}
            />
          )}
          onReorder={(parts) => change({ parts })}
        />
      </GroupedSection>
      <GroupedSection footer="Sugar and salt have no goal, so they are hidden too.">
        <ToggleRow
          label="Only nutrients with a goal"
          checked={settings.summary.onlyWithGoal}
          onChange={(onlyWithGoal) => change({ onlyWithGoal })}
        />
      </GroupedSection>
    </>
  )
}

/** Settings › Notifications › Day summary: what the summary tells, and in which order. */
export function DaySummaryPage() {
  const { profile } = useCurrentUser()
  const preferences = usePreferences(profile.id)
  const save = useSavePreferences(profile.id)
  const loaded = preferences.data

  return (
    <AppearanceSubPage
      title="Day summary"
      back={{ path: NOTIFICATIONS_PATH, label: 'Notifications' }}
      saveError={save.error}
    >
      {preferences.isError ? (
        <ErrorBanner message={toUserMessage(preferences.error)} />
      ) : !loaded ? (
        <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
      ) : (
        <DaySummaryForm loaded={loaded} onSave={(next) => save.mutate(next)} />
      )}
    </AppearanceSubPage>
  )
}
