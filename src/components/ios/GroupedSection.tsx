import { useId, type ReactNode } from 'react'

type GroupedSectionProps = {
  readonly header?: string
  readonly footer?: ReactNode
  /** makes the section a region named by its header, for screen readers and tests */
  readonly region?: boolean
  /** id of the footer, so a control above can be described by it */
  readonly footerId?: string
  readonly children: ReactNode
}

/** A titled card of rows with hairline separators. */
export function GroupedSection({
  header,
  footer,
  region = false,
  footerId,
  children,
}: GroupedSectionProps) {
  const headerId = useId()
  return (
    <section aria-labelledby={region && header ? headerId : undefined} className="mt-6">
      {header && (
        <h2 id={headerId} className="caption px-4 pb-2">
          {header}
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
