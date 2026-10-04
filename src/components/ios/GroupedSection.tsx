import type { ReactNode } from 'react'

type GroupedSectionProps = {
  readonly header?: string
  readonly footer?: ReactNode
  readonly children: ReactNode
}

/** A titled card of rows with hairline separators. */
export function GroupedSection({ header, footer, children }: GroupedSectionProps) {
  return (
    <section className="mt-6">
      {header && <h2 className="caption px-4 pb-2">{header}</h2>}
      <div className="divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card">
        {children}
      </div>
      {footer && <div className="px-4 pt-2 text-[13px] text-label-secondary">{footer}</div>}
    </section>
  )
}
