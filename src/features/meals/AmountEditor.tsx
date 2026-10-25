import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ReferenceValues } from '../ingredients/ReferenceValues'
import type { ReferenceTable } from '../ingredients/referenceValues'
import { parseDecimal, roundTo } from '../../lib/numbers'
import { formatKcal, macroSummary } from '../nutrition/format'
import type { AmountUnit, NutritionTotals } from '../nutrition/types'
import { amountSuffix, unitChoiceLabel } from '../nutrition/unitNames'

const STEP: Record<AmountUnit, number> = { g: 10, ml: 10, unit: 1 }
const AMOUNT_DECIMALS = 2

type AmountEditorProps = {
  readonly title: string
  /** the ingredient's values per 100 g and per unit, under the amount */
  readonly reference?: ReferenceTable
  readonly units: readonly AmountUnit[]
  /** shown instead of "Units", e.g. "Riegel" */
  readonly unitLabel?: string | null
  readonly initialAmount?: string
  readonly confirmLabel: string
  readonly preview: (amount: number, unit: AmountUnit) => NutritionTotals | null
  readonly onConfirm: (amount: number, unit: AmountUnit) => void
  readonly secondaryAction?: ReactNode
}

export function AmountEditor({
  title,
  reference,
  units,
  unitLabel,
  initialAmount = '',
  confirmLabel,
  preview,
  onConfirm,
  secondaryAction,
}: AmountEditorProps) {
  const [amountText, setAmountText] = useState(initialAmount)
  const [unit, setUnit] = useState<AmountUnit>(units[0] ?? 'g')
  const [error, setError] = useState<string | null>(null)
  const unitName = amountSuffix(unit, unitLabel)
  const amount = parseDecimal(amountText)
  const totals = amount !== null && amount > 0 ? preview(amount, unit) : null

  function step(direction: 1 | -1) {
    const next = roundTo((amount ?? 0) + direction * STEP[unit], AMOUNT_DECIMALS)
    if (next > 0) setAmountText(String(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (amount === null || totals === null) {
      setError('Enter an amount')
      return
    }
    onConfirm(amount, unit)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-2">
      <h3 className="text-[20px] font-semibold">{title}</h3>
      {units.length > 1 && (
        <div className="mt-4">
          <SegmentedControl
            label="Unit"
            options={units.map((value) => ({
              value,
              label: unitChoiceLabel(value, unitLabel),
            }))}
            value={unit}
            onChange={setUnit}
          />
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-bg-elevated px-3 py-2 shadow-card">
        <Button variant="plain" aria-label="Less" onClick={() => step(-1)} className="text-[24px]">
          −
        </Button>
        <input
          aria-label="Amount"
          inputMode="decimal"
          placeholder="0"
          value={amountText}
          onChange={(event) => {
            setAmountText(event.target.value)
            setError(null)
          }}
          className="min-w-0 flex-1 bg-transparent text-center text-[28px] font-semibold text-label outline-none"
        />
        <span className="text-[17px] text-label-secondary">{unitName}</span>
        <Button variant="plain" aria-label="More" onClick={() => step(1)} className="text-[24px]">
          +
        </Button>
      </div>
      {error && <p className="mt-1 px-1 text-[13px] text-destructive">{error}</p>}
      {reference && <ReferenceValues table={reference} />}
      <div data-testid="amount-preview" className="mt-3 px-1 text-[15px] text-label-secondary">
        {totals ? `${formatKcal(totals.kcal)} kcal · ${macroSummary(totals)}` : '–'}
      </div>
      <div className="mt-6">
        <Button type="submit">{confirmLabel}</Button>
      </div>
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </form>
  )
}
