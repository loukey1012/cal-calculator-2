const FRACTIONS = [
  { label: '¼', text: '1/4' },
  { label: '⅓', text: '1/3' },
  { label: '½', text: '1/2' },
  { label: '⅔', text: '2/3' },
  { label: '¾', text: '3/4' },
] as const

type FractionChipsProps = {
  readonly onPick: (fraction: string) => void
}

/** Parts of a unit, which the iOS number keypad can't type (it has no "/"). */
export function FractionChips({ onPick }: FractionChipsProps) {
  return (
    <div role="group" aria-label="Fractions" className="flex gap-2 px-4 pt-1 pb-3">
      {FRACTIONS.map(({ label, text }) => (
        <button
          key={text}
          type="button"
          aria-label={text}
          onClick={() => onPick(text)}
          className="h-9 min-w-11 rounded-full bg-fill px-3 text-[17px] font-semibold text-label active:opacity-60"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
