import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ReorderList } from '../../components/ios/ReorderList'
import { useCurrentUser } from '../../app/currentUser'
import { toUserMessage } from '../../lib/errors'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import type { NotificationSettings } from '../../../supabase/functions/_shared/notificationSettings.ts'
import type { PushMessage } from '../../../supabase/functions/_shared/schedule.ts'
import { usePreferences, useSavePreferences } from './hooks'
import { NOTIFICATIONS_PATH } from './paths'
import { deviceTimeZone, type Preferences } from './preferencesApi'

type Part<Id extends string> = { readonly id: Id; readonly on: boolean }

/** The two settings these pages change, whichever notification they belong to. */
type Contents<Id extends string> = {
  readonly parts: ReadonlyArray<Part<Id>>
  readonly onlyWithGoal: boolean
}

/** How one notification kind's contents are read, changed and previewed. */
export type ContentsKind<Id extends string> = {
  readonly title: string
  /** under the preview, e.g. "Example day" */
  readonly caption: string
  readonly labels: Readonly<Record<Id, string>>
  readonly read: (settings: NotificationSettings) => Contents<Id>
  readonly write: (
    settings: NotificationSettings,
    change: Partial<Contents<Id>>,
  ) => NotificationSettings
  readonly preview: (settings: NotificationSettings) => PushMessage
}

/** How the notification looks on the lock screen, for the example. */
function NotificationPreview({
  message,
  caption,
}: {
  readonly message: PushMessage
  readonly caption: string
}) {
  const { title, body } = message
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
      <p className="px-4 pt-2 text-center text-[13px] text-label-secondary">{caption}</p>
    </div>
  )
}

function ContentsForm<Id extends string>({
  kind,
  loaded,
  onSave,
}: {
  readonly kind: ContentsKind<Id>
  readonly loaded: Preferences
  readonly onSave: (next: Preferences) => void
}) {
  const { settings } = loaded
  const { parts, onlyWithGoal } = kind.read(settings)
  // each change is saved at once, like everywhere on the Notifications pages
  const change = (next: Partial<Contents<Id>>) =>
    onSave({
      settings: kind.write(settings, next),
      timeZone: deviceTimeZone() ?? loaded.timeZone,
    })
  const toggle = (part: Part<Id>, on: boolean) =>
    change({ parts: parts.map((p) => (p.id === part.id ? { ...p, on } : p)) })

  return (
    <>
      <NotificationPreview message={kind.preview(settings)} caption={kind.caption} />
      <GroupedSection header="Shown in the notification">
        <ReorderList
          items={parts}
          getKey={(part) => part.id}
          getLabel={(part) => kind.labels[part.id]}
          renderRow={(part) => (
            <ToggleRow
              label={kind.labels[part.id]}
              checked={part.on}
              onChange={(on) => toggle(part, on)}
            />
          )}
          onReorder={(reordered) => change({ parts: reordered })}
        />
      </GroupedSection>
      <GroupedSection footer="Sugar and salt have no goal, so they are hidden too.">
        <ToggleRow
          label="Only nutrients with a goal"
          checked={onlyWithGoal}
          onChange={(next) => change({ onlyWithGoal: next })}
        />
      </GroupedSection>
    </>
  )
}

/** Settings › Notifications › <kind>: what the notification tells, and in which order. */
export function SummaryContentsPage<Id extends string>({
  kind,
}: {
  readonly kind: ContentsKind<Id>
}) {
  const { profile } = useCurrentUser()
  const preferences = usePreferences(profile.id)
  const save = useSavePreferences(profile.id)
  const loaded = preferences.data

  return (
    <AppearanceSubPage
      title={kind.title}
      back={{ path: NOTIFICATIONS_PATH, label: 'Notifications' }}
      saveError={save.error}
    >
      {preferences.isError ? (
        <ErrorBanner message={toUserMessage(preferences.error)} />
      ) : !loaded ? (
        <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
      ) : (
        <ContentsForm kind={kind} loaded={loaded} onSave={(next) => save.mutate(next)} />
      )}
    </AppearanceSubPage>
  )
}
