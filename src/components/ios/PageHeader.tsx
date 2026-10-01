type PageHeaderProps = { readonly title: string; readonly subtitle?: string }

/** iOS large title. */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="pt-4 pb-2">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-[15px] text-label-secondary">{subtitle}</p>}
    </header>
  )
}
