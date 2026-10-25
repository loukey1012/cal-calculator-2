import type { RingKey } from '../nutrition/goals'
import { MISSING_VALUE, type ReferenceTable } from './referenceValues'

const HEADINGS: Record<RingKey, string> = {
  kcal: 'kcal',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
}

function cellText(key: RingKey, value: string): string {
  return key === 'kcal' || value === MISSING_VALUE ? value : `${value} g`
}

/** A small table: a row per 100 g and per unit, a column per tracked nutrient. */
export function ReferenceValues({ table }: { readonly table: ReferenceTable }) {
  return (
    <table
      data-testid="reference-values"
      className="mt-3 w-full table-fixed text-[13px] tabular-nums text-label-secondary"
    >
      <thead>
        <tr>
          <th scope="col" className="px-1 pb-0.5 text-left font-normal">
            <span className="sr-only">Per</span>
          </th>
          {table.nutrients.map((key) => (
            <th key={key} scope="col" className="px-1 pb-0.5 text-right font-normal">
              {HEADINGS[key]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.basis}>
            <th scope="row" className="truncate px-1 text-left font-semibold text-label">
              {row.basis}
            </th>
            {row.values.map((value, index) => {
              const key = table.nutrients[index] ?? 'kcal'
              return (
                <td key={key} className="px-1 text-right font-semibold text-label">
                  {cellText(key, value)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
