import type { ReactNode } from 'react'
import { Avatar } from '../../components/ios/Avatar'
import { SYMBOL_GROUP_LABELS, SYMBOLS, type PersonSymbol, type SymbolGroup } from './partnerLook'
import { SymbolBadge } from './PersonBadge'

type SymbolPickerProps = {
  /** null: the initial (only offered with `initialOf`) */
  readonly value: PersonSymbol | null
  /** each choice is shown in the color picked below it */
  readonly color: string
  /** a name whose initial is offered as the first choice, e.g. your own */
  readonly initialOf?: string
  readonly onChange: (value: PersonSymbol | null) => void
}

const GROUPS = Object.keys(SYMBOL_GROUP_LABELS) as SymbolGroup[]
const SELECTED = 'ring-2 ring-label ring-offset-2 ring-offset-bg-elevated'

type ChoiceProps = {
  readonly label: string
  readonly selected: boolean
  readonly onSelect: () => void
  readonly children: ReactNode
}

function Choice({ label, selected, onSelect, children }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={`rounded-full p-0.5 ${selected ? SELECTED : ''}`}
    >
      {children}
    </button>
  )
}

/** The hearts, cute and cool emojis in groups, six to a row; optionally the initial first. */
export function SymbolPicker({ value, color, initialOf, onChange }: SymbolPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Symbol"
      className="flex flex-col gap-4 rounded-3xl bg-bg-elevated p-4 shadow-card"
    >
      {initialOf !== undefined && (
        <div className="grid grid-cols-6 justify-items-center gap-3">
          <Choice label="Initial" selected={value === null} onSelect={() => onChange(null)}>
            <Avatar name={initialOf} color={color} size="large" />
          </Choice>
        </div>
      )}
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="caption mb-2 px-1 text-[12px] text-label-secondary">
            {SYMBOL_GROUP_LABELS[group]}
          </p>
          <div className="grid grid-cols-6 justify-items-center gap-3">
            {SYMBOLS.filter((symbol) => symbol.group === group).map((symbol) => (
              <Choice
                key={symbol.value}
                label={symbol.name}
                selected={symbol.value === value}
                onSelect={() => onChange(symbol.value)}
              >
                <SymbolBadge symbol={symbol.value} color={color} size="large" />
              </Choice>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
