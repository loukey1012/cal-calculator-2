import type { ReactNode } from 'react'

type PageHeaderProps = {
  readonly title: string
  readonly subtitle?: string
  /** navigation bar control above the large title, e.g. an add button */
  readonly action?: ReactNode
}

/** iOS large title. */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="pb-2">
      <div className="flex min-h-11 items-center justify-end">{action}</div>
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-[15px] text-label-secondary">{subtitle}</p>}
    </header>
  )
}
