import { GroupedSection } from '../../components/ios/GroupedSection'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import { groupByDay, PATCH_NOTES, type PatchNoteKind } from './patchNotes'

export const PATCH_NOTES_PATH = '/settings/patch-notes'

const KIND_LABELS: Record<PatchNoteKind, string> = { new: 'New', fix: 'Fix', internal: 'Internal' }

function dayHeading(day: string, locale?: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year ?? 0, (month ?? 1) - 1, date ?? 1))
}

/** Settings › Patch notes: what changed, by day and hour, newest first. */
export function PatchNotesPage() {
  return (
    <AppearanceSubPage
      title="Patch notes"
      back={{ path: '/settings', label: 'Settings' }}
      saveError={null}
    >
      {groupByDay(PATCH_NOTES).map(({ day, notes }) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="caption px-1">{dayHeading(day)}</h2>
          <GroupedSection>
            {notes.map((note) => (
              <div key={`${note.at}-${note.title}`} className="flex gap-3 px-4 py-3">
                <span className="w-11 shrink-0 text-[14px] font-bold text-label-secondary">
                  {note.at.slice(11)}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[15px] font-semibold ${note.kind === 'internal' ? 'text-label-secondary' : ''}`}
                  >
                    <span className="mr-1.5 text-[11px] font-extrabold tracking-[0.06em] text-accent-ink uppercase">
                      {KIND_LABELS[note.kind]}
                    </span>
                    {note.title}
                  </p>
                  {note.items?.map((item) => (
                    <p key={item} className="text-[13px] font-medium text-label-secondary">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </GroupedSection>
        </section>
      ))}
    </AppearanceSubPage>
  )
}
