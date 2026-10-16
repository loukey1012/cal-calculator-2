type ReviewButtonProps = {
  readonly count: number
  readonly onClick: () => void
}

/** Opens the weekly review's open findings; shown only while there are any. */
export function ReviewButton({ count, onClick }: ReviewButtonProps) {
  if (count === 0) return null
  return (
    <button
      type="button"
      aria-label={`Review: ${count}`}
      onClick={onClick}
      className="glass-surface h-8 rounded-full bg-bg-elevated px-3 text-[14px] font-bold text-accent-ink shadow-card"
    >
      Review · {count}
    </button>
  )
}
