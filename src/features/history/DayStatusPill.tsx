import type { CSSProperties } from 'react'
import { dayStatusPill, type DayStatusInput, type PillTone } from './dayStatusPill'

/** The tone's color: the user's own over colors for over the goal, theme colors for the rest (the day-pill class darkens the text). */
const TONE_COLORS: Record<PillTone, string> = {
  within: 'var(--success)',
  over: 'var(--goal-over-full, var(--destructive))',
  wellOver: 'var(--goal-over-well, var(--destructive))',
  leftOut: 'var(--label-secondary)',
  alcohol: 'var(--alcohol)',
  missing: 'var(--warning)',
  neutral: 'var(--label-secondary)',
}

/** The verdict on an open day, e.g. "Within goal · 320 kcal left"; it is words, color only helps. */
export function DayStatusPill({ input }: { readonly input: DayStatusInput }) {
  const pill = dayStatusPill(input)
  if (!pill) return null
  const color = TONE_COLORS[pill.tone]
  return (
    <p
      data-testid="day-status"
      style={{ '--pill-color': color } as CSSProperties}
      className="day-pill rounded-full px-3 py-1 text-[13px] font-bold"
    >
      {pill.text}
    </p>
  )
}
