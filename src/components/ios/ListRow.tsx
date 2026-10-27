import type { ReactNode } from 'react'
import { ChevronRightIcon } from './icons'

type ListRowProps = {
  /** a small accent line above the title, e.g. the brand */
  readonly overline?: ReactNode
  readonly title: ReactNode
  readonly subtitle?: ReactNode
  readonly detail?: ReactNode
  /** the detail is an action to take, not a figure: shown in the accent color */
  readonly accentDetail?: boolean
  /** the name a screen reader gives a tappable row, when its text alone says too little */
  readonly ariaLabel?: string
  readonly leading?: ReactNode
  /** makes the row tappable and adds a disclosure chevron */
  readonly onClick?: () => void
}

/** A row inside a GroupedSection. */
export function ListRow({
  overline,
  title,
  subtitle,
  detail,
  accentDetail = false,
  ariaLabel,
  leading,
  onClick,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        {overline && (
          <p className="truncate text-[11px] font-extrabold tracking-[0.07em] text-accent-ink uppercase">
            {overline}
          </p>
        )}
        <p className="truncate text-[16px] font-semibold">{title}</p>
        {subtitle && (
          <p className="truncate text-[13px] font-medium text-label-secondary">{subtitle}</p>
        )}
      </div>
      {detail && (
        // a long detail (e.g. the full daily goal) gives way before the title does
        <span
          className={`max-w-[65%] min-w-0 truncate text-[15px] font-semibold ${
            accentDetail ? 'text-accent-ink' : 'text-label-secondary'
          }`}
        >
          {detail}
        </span>
      )}
      {onClick && (
        <ChevronRightIcon data-testid="chevron" className="h-4 w-4 shrink-0 text-label-secondary" />
      )}
    </>
  )

  if (!onClick) return <div className="flex min-h-14 items-center gap-3 px-4 py-3">{content}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-fill"
    >
      {content}
    </button>
  )
}
