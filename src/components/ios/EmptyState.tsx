type EmptyStateProps = { readonly title: string; readonly message: string }

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="mt-6 rounded-3xl bg-bg-elevated px-6 py-10 text-center shadow-card">
      <p className="font-display text-[17px] font-bold">{title}</p>
      <p className="mt-1 text-[15px] text-label-secondary">{message}</p>
    </div>
  )
}
