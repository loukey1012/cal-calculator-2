import { useId, type ReactNode } from 'react'
import { EllipsisIcon } from './icons'

type GroupedSectionProps = {
  readonly header?: string
  readonly footer?: ReactNode
  /** makes the section a region named by its header, for screen readers and tests */
  readonly region?: boolean
  /** id of the footer, so a control above can be described by it */
  readonly footerId?: string
  /** makes the header a button (title + ellipsis), e.g. to edit what the section shows */
  readonly onHeaderClick?: () => void
  readonly children: ReactNode
}

/** A titled card of rows with hairline separators. */
export function GroupedSection({
  header,
  footer,
  region = false,
  footerId,
  onHeaderClick,
  children,
}: GroupedSectionProps) {
  const headerId = useId()
  return (
    <section aria-labelledby={region && header ? headerId : undefined} className="mt-6">
      {header && (
        <h2 id={headerId} className={onHeaderClick ? 'caption' : 'caption px-4 pb-2'}>
          {onHeaderClick ? (
            <button
              type="button"
              onClick={onHeaderClick}
              className="flex min-h-11 w-full items-end gap-2 rounded-xl px-4 pb-2 text-left [text-transform:inherit] active:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {header}
              <span className="sr-only">, edit</span>
              <EllipsisIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            header
          )}
        </h2>
      )}
      <div className="glass-surface divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card">
        {children}
      </div>
      {footer && (
        <div id={footerId} className="px-4 pt-2 text-[13px] text-label-secondary">
          {footer}
        </div>
      )}
    </section>
  )
}
