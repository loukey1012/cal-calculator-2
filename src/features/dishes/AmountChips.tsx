const WHOLE_NUMBERS = ['1', '2', '3', '4', '5'] as const

const FRACTIONS = [
  { label: '¼', text: '1/4' },
  { label: '⅓', text: '1/3' },
  { label: '½', text: '1/2' },
  { label: '⅔', text: '2/3' },
  { label: '¾', text: '3/4' },
] as const

const CHIP_CLASS =
  'h-9 min-w-11 rounded-full bg-fill px-3 text-[17px] font-semibold text-label active:opacity-60'

type AmountChipsProps = {
  /** a whole number replaces the amount */
  readonly onWhole: (whole: string) => void
  /** a fraction goes after a whole number, or replaces anything else */
  readonly onFraction: (fraction: string) => void
}

/** Quick amounts in units: whole numbers, and the parts the iOS number keypad can't type (it has no "/"). */
export function AmountChips({ onWhole, onFraction }: AmountChipsProps) {
  return (
    <div className="flex flex-col gap-2 px-4 pt-1 pb-3">
      <div role="group" aria-label="Whole numbers" className="flex gap-2">
        {WHOLE_NUMBERS.map((whole) => (
          <button key={whole} type="button" onClick={() => onWhole(whole)} className={CHIP_CLASS}>
            {whole}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Fractions" className="flex gap-2">
        {FRACTIONS.map(({ label, text }) => (
          <button
            key={text}
            type="button"
            aria-label={text}
            onClick={() => onFraction(text)}
            className={CHIP_CLASS}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
