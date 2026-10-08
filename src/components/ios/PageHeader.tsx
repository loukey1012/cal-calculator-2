import type { ReactNode } from 'react'

type PageHeaderProps = {
  readonly title: string
  readonly subtitle?: string
  /** navigation bar control above the large title, e.g. an add button */
  readonly action?: ReactNode
  /** navigation bar control on the left, e.g. a back button */
  readonly leading?: ReactNode
  /** beside the large title, e.g. Today's weight; costs no extra height */
  readonly titleAccessory?: ReactNode
}

/** Large page title with optional bar buttons above it. */
export function PageHeader({ title, subtitle, action, leading, titleAccessory }: PageHeaderProps) {
  const hasBar = Boolean(leading || action)
  return (
    // iOS draws a fade below the translucent status bar (and offers web apps no way to turn
    // it off): the bar row clears it for the title; without that row the date or title needs
    // more room of its own
    <header className={`${hasBar ? 'pt-3' : 'pt-6'} pb-2`}>
      {/* without buttons the row would only cost height (Today must fit the screen) */}
      {hasBar && (
        <div data-testid="page-header-bar" className="flex min-h-11 items-center justify-between">
          <div>{leading}</div>
          <div>{action}</div>
        </div>
      )}
      {subtitle && <p className="caption">{subtitle}</p>}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-tight font-extrabold tracking-tight">
          {title}
        </h1>
        {titleAccessory}
      </div>
    </header>
  )
}
