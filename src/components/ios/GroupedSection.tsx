import type { ReactNode } from 'react'

type GroupedSectionProps = {
  readonly header?: string
  readonly footer?: ReactNode
  readonly children: ReactNode
}

/** iOS "inset grouped" list section: rounded card with hairline separators. */
export function GroupedSection({ header, footer, children }: GroupedSectionProps) {
  return (
    <section className="mt-6">
      {header && (
        <h2 className="px-4 pb-1.5 text-[13px] text-label-secondary uppercase">{header}</h2>
      )}
      <div className="divide-y divide-separator overflow-hidden rounded-xl bg-bg-elevated">
        {children}
      </div>
      {footer && <div className="px-4 pt-1.5 text-[13px] text-label-secondary">{footer}</div>}
    </section>
  )
}
