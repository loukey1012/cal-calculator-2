import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { calculateMissingValues } from './formActions'
import type { IngredientFormValues } from './ingredientForm'

type CalculateRowProps = {
  readonly values: IngredientFormValues
  readonly onCalculated: (values: IngredientFormValues) => void
}

const NOTHING = 'Nothing to calculate: every value is filled in or unknown.'
const NEEDS_WEIGHT = 'Enter the grams per unit first.'
const ESTIMATED = 'Calories from protein, carbs and fat: marked as an estimate.'

function filledText(count: number, kcalFromMacros: boolean): string {
  const filled = count === 1 ? 'Filled in 1 value.' : `Filled in ${count} values.`
  return kcalFromMacros ? `${filled} ${ESTIMATED}` : filled
}

/** Works out empty values (see calculateMissingValues); never replaces one. */
export function CalculateRow({ values, onCalculated }: CalculateRowProps) {
  const [message, setMessage] = useState<string | null>(null)

  function calculate() {
    const result = calculateMissingValues(values)
    if (result.kind === 'filled') {
      onCalculated(result.values)
      setMessage(filledText(result.count, result.kcalFromMacros))
    } else {
      setMessage(result.kind === 'nothing' ? NOTHING : NEEDS_WEIGHT)
    }
  }

  return (
    <div className="flex items-center gap-3 py-1 pr-2 pl-4">
      <p role="status" className="flex-1 text-[13px] text-label-secondary">
        {message}
      </p>
      <Button variant="plain" onClick={calculate}>
        Calculate missing values
      </Button>
    </div>
  )
}
