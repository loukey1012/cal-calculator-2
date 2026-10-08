import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { parseDecimal } from '../../lib/numbers'
import { calculateMissingValues, type IngredientFormValues } from './ingredientForm'

type CalculateRowProps = {
  readonly values: IngredientFormValues
  readonly onCalculated: (values: IngredientFormValues) => void
}

const NOTHING = 'Nothing to calculate: every value is filled in or unknown.'

function filledText(count: number): string {
  return count === 1 ? 'Filled in 1 value.' : `Filled in ${count} values.`
}

/** Works out empty values per 100 g or per unit from the other, with the grams per unit. */
export function CalculateRow({ values, onCalculated }: CalculateRowProps) {
  const [message, setMessage] = useState<string | null>(null)
  const weight = parseDecimal(values.unitWeightG)
  const hasWeight = weight !== null && weight > 0

  function calculate() {
    const result = calculateMissingValues(values)
    if (result.kind === 'filled') {
      onCalculated(result.values)
      setMessage(filledText(result.count))
    } else {
      setMessage(result.kind === 'nothing' ? NOTHING : 'Enter the grams per unit first.')
    }
  }

  return (
    <div className="flex items-center gap-3 py-1 pr-2 pl-4">
      <p role="status" className="flex-1 text-[13px] text-label-secondary">
        {hasWeight ? message : 'Enter the grams per unit to calculate.'}
      </p>
      <Button variant="plain" disabled={!hasWeight} onClick={calculate}>
        Calculate missing values
      </Button>
    </div>
  )
}
