import type { ReactNode } from 'react'

type PageHeaderProps = {
  readonly title: string
  readonly subtitle?: string
  /** navigation bar control above the large title, e.g. an add button */
  readonly action?: ReactNode
  /** navigation bar control on the left, e.g. a back button */
  readonly leading?: ReactNode
}

/** Large page title with optional bar buttons above it. */
export function PageHeader({ title, subtitle, action, leading }: PageHeaderProps) {
  return (
    // keeps the bar buttons clear of the fade iOS draws below the status bar
    <header className="pt-3 pb-2">
      <div className="flex min-h-11 items-center justify-between">
        <div>{leading}</div>
        <div>{action}</div>
      </div>
      {subtitle && <p className="caption">{subtitle}</p>}
      <h1 className="font-display text-[32px] leading-tight font-extrabold tracking-tight">
        {title}
      </h1>
    </header>
  )
}
