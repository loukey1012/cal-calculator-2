import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { formatKcal, macroSummary } from '../nutrition/format'
import { itemTotals } from '../nutrition/totals'
import type { AmountUnit } from '../nutrition/types'
import { DecimalRow } from './DecimalRow'
import type { LineAmounts, LineWho } from './dishDraft'
import type { DishLine } from './portions'

/** An eating portion as the editor shows it. */
export type PortionOption = { readonly id: string; readonly name: string }

export type LineInput = LineAmounts & { readonly unit: AmountUnit }

type WhoValue = 'shared' | 'own' | `only:${string}`

type DishLineEditorProps = {
  readonly title: string
  readonly units: readonly AmountUnit[]
  readonly unitLabel?: string | null
  readonly portions: readonly PortionOption[]
  readonly initialWho?: LineWho
  /** the whole amount (shared or only one person), or each portion's own amount */
  readonly initialAmount?: number | null
  readonly initialAmounts?: Readonly<Record<string, number>>
  readonly confirmLabel: string
  /** builds the line for a preview and for saving; throws when the input can't be logged */
  readonly build: (input: LineInput) => DishLine
  readonly onConfirm: (line: DishLine) => void
  readonly secondaryAction?: ReactNode
}

function whoValue(who: LineWho): WhoValue {
  return who.kind === 'only' ? `only:${who.portionId}` : who.kind
}

function inputFor(
  who: WhoValue,
  unit: AmountUnit,
  amount: number | null,
  amounts: Readonly<Record<string, number | null>>,
): LineInput | null {
  if (who === 'own') {
    const known = Object.entries(amounts).flatMap(([id, value]) =>
      value === null ? [] : [[id, value] as const],
    )
    return { unit, allocation: 'per_portion', amounts: Object.fromEntries(known) }
  }
  if (amount === null) return null
  if (who === 'shared') return { unit, allocation: 'shared', amount }
  return { unit, allocation: 'per_portion', amounts: { [who.slice('only:'.length)]: amount } }
}

function tryBuild(build: DishLineEditorProps['build'], input: LineInput | null): DishLine | null {
  if (!input) return null
  try {
    return build(input)
  } catch {
    return null
  }
}

/** One ingredient of a dish: its unit, who has it and how much. */
export function DishLineEditor({
  title,
  units,
  unitLabel,
  portions,
  initialWho = { kind: 'shared' },
  initialAmount = null,
  initialAmounts = {},
  confirmLabel,
  build,
  onConfirm,
  secondaryAction,
}: DishLineEditorProps) {
  const [who, setWho] = useState<WhoValue>(whoValue(initialWho))
  const [unit, setUnit] = useState<AmountUnit>(units[0] ?? 'g')
  const [amount, setAmount] = useState<number | null>(initialAmount)
  const [amounts, setAmounts] = useState<Readonly<Record<string, number | null>>>(initialAmounts)
  const [error, setError] = useState<string | null>(null)
  const unitName = unit === 'g' ? 'g' : (unitLabel ?? 'units')
  const line = tryBuild(build, inputFor(who, unit, amount, amounts))
  const totals = line ? itemTotals(line.item) : null
  const whoOptions = [
    { value: 'shared' as const, label: 'Shared' },
    ...portions.map(({ id, name }) => ({ value: `only:${id}` as const, label: `Only ${name}` })),
    { value: 'own' as const, label: 'Own amounts' },
  ]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!line) {
      setError(who === 'own' ? 'Give at least one person an amount' : 'Enter an amount')
      return
    }
    onConfirm(line)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-2">
      <h3 className="text-[20px] font-semibold">{title}</h3>
      {portions.length > 1 && (
        <div className="mt-4">
          <SegmentedControl label="Who" options={whoOptions} value={who} onChange={setWho} />
        </div>
      )}
      {units.length > 1 && (
        <div className="mt-3">
          <SegmentedControl
            label="Unit"
            options={units.map((value) => ({
              value,
              label: value === 'g' ? 'Grams' : (unitLabel ?? 'Units'),
            }))}
            value={unit}
            onChange={setUnit}
          />
        </div>
      )}
      <GroupedSection
        footer={who === 'shared' ? 'Everything that went into the dish; it is split below.' : null}
      >
        {who === 'own' ? (
          portions.map(({ id, name }) => (
            <DecimalRow
              key={id}
              label={name}
              accessibleLabel={`${name} amount`}
              suffix={unitName}
              value={amounts[id] ?? null}
              onChange={(value) => {
                setAmounts((current) => ({ ...current, [id]: value }))
                setError(null)
              }}
            />
          ))
        ) : (
          <DecimalRow
            label="Amount"
            suffix={unitName}
            value={amount}
            onChange={(value) => {
              setAmount(value)
              setError(null)
            }}
          />
        )}
      </GroupedSection>
      {error && <p className="mt-1 px-4 text-[13px] text-destructive">{error}</p>}
      <p data-testid="line-preview" className="mt-3 px-4 text-[15px] text-label-secondary">
        {totals ? `${formatKcal(totals.kcal)} kcal · ${macroSummary(totals)}` : '–'}
      </p>
      <div className="mt-6">
        <Button type="submit">{confirmLabel}</Button>
      </div>
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </form>
  )
}
