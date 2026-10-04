import type { ReactNode } from 'react'
import { ChevronRightIcon } from './icons'

type ListRowProps = {
  readonly title: ReactNode
  readonly subtitle?: ReactNode
  readonly detail?: ReactNode
  readonly leading?: ReactNode
  /** makes the row tappable and adds a disclosure chevron */
  readonly onClick?: () => void
}

/** A row inside a GroupedSection. */
export function ListRow({ title, subtitle, detail, leading, onClick }: ListRowProps) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold">{title}</p>
        {subtitle && (
          <p className="truncate text-[13px] font-medium text-label-secondary">{subtitle}</p>
        )}
      </div>
      {detail && (
        // a long detail (e.g. the full daily goal) gives way before the title does
        <span className="max-w-[65%] min-w-0 truncate text-[15px] font-semibold text-label-secondary">
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
      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-fill"
    >
      {content}
    </button>
  )
}
