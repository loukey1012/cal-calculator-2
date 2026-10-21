import { ClearIcon } from './icons'

type ClearButtonProps = {
  /** what it clears, e.g. "Sugar per 100 g"; without, it is just "Clear" (right after its field) */
  readonly label?: string
  readonly onClick: () => void
}

/** The small (×) at the end of a field. */
export function ClearButton({ label, onClick }: ClearButtonProps) {
  return (
    <button
      type="button"
      aria-label={label ? `Clear ${label}` : 'Clear'}
      onClick={onClick}
      // a 44 pt tap target around the small icon
      className="-m-2.5 shrink-0 p-2.5 text-label-secondary/50 active:opacity-60"
    >
      <ClearIcon className="h-[18px] w-[18px]" />
    </button>
  )
}
