import { PARTNER_SYMBOLS, type PartnerSymbol } from './partnerLook'
import { SymbolBadge } from './PersonBadge'

type SymbolPickerProps = {
  readonly value: PartnerSymbol
  /** each choice is shown in the color picked below it */
  readonly color: string
  readonly onChange: (value: PartnerSymbol) => void
}

/** The heart and the emojis, six to a row. */
export function SymbolPicker({ value, color, onChange }: SymbolPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Symbol"
      className="grid grid-cols-6 justify-items-center gap-3 rounded-3xl bg-bg-elevated p-4 shadow-card"
    >
      {PARTNER_SYMBOLS.map((symbol) => {
        const selected = symbol.value === value
        return (
          <button
            key={symbol.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={symbol.name}
            onClick={() => onChange(symbol.value)}
            className={`rounded-full p-0.5 ${selected ? 'ring-2 ring-label ring-offset-2 ring-offset-bg-elevated' : ''}`}
          >
            <SymbolBadge symbol={symbol.value} color={color} size="large" />
          </button>
        )
      })}
    </div>
  )
}
