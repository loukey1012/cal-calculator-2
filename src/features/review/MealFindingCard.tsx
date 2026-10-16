import { Button } from '../../components/ios/Button'
import { mealLabel } from '../meals/dayModel'
import { formatSpan } from '../trends/trendFormat'
import { FINDING_KIND_LABELS } from './kinds'
import type { Finding } from './reviewApi'

type MealFindingCardProps = {
  readonly finding: Finding
  /** how the person is shown to you: your partner by their nickname */
  readonly personName: string
  readonly busy: boolean
  readonly onOpenDay: () => void
  readonly onDone: () => void
  readonly onIgnore: () => void
}

/** A finding about someone's day: who, which day and meal, why; nothing is changed from here. */
export function MealFindingCard({
  finding,
  personName,
  busy,
  onOpenDay,
  onDone,
  onIgnore,
}: MealFindingCardProps) {
  const day = finding.date ? formatSpan(finding.date, finding.date) : ''
  const title = `${personName} · ${day}`

  return (
    <article
      aria-label={title}
      className="glass-surface rounded-3xl bg-bg-elevated p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold">{title}</p>
          {finding.meal_type && (
            <p className="text-[14px] font-semibold text-label-secondary">
              {mealLabel(finding.meal_type)}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-fill px-2.5 py-0.5 text-[13px] font-semibold text-label-secondary">
          {FINDING_KIND_LABELS[finding.kind]}
        </span>
      </div>
      <p className="mt-1 text-[15px] text-label">{finding.message}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="plain" disabled={busy} onClick={onIgnore}>
          Ignore
        </Button>
        <Button variant="plain" disabled={busy} onClick={onDone}>
          Done
        </Button>
        <Button variant="plain" onClick={onOpenDay}>
          Open day
        </Button>
      </div>
    </article>
  )
}
