import { useState, type ReactNode } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ProductSearchPanel } from '../barcode/ProductSearchPanel'
import type { ProductHit } from '../barcode/openFoodFacts'
import { IngredientPickList } from './IngredientPickList'
import { toFormValues, type IngredientFormValues } from './ingredientForm'
import type { Ingredient } from './ingredientsApi'

type Mode = 'closed' | 'copy' | 'search'

/** Values from somewhere else, to take over into the form. */
export type FilledValues = {
  readonly values: IngredientFormValues
  /** e.g. "Copied from Skyr" */
  readonly message: string
  /** the portion as printed on a product's package */
  readonly packagePortion: string | null
}

type ValueSourcesProps = {
  /** what is typed as the name, to search with */
  readonly name: string
  readonly savedIngredients: readonly Ingredient[]
  readonly onFill: (filled: FilledValues) => void
  /** shown right after filling in */
  readonly undo?: ReactNode
}

function SourceRow({
  label,
  open,
  onClick,
}: {
  readonly label: string
  readonly open: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="block w-full px-4 py-3 text-left text-[17px] text-accent-ink active:opacity-60"
    >
      {label}
    </button>
  )
}

/**
 * For food without values on it (or an unknown package): copy them from a saved ingredient, or
 * from a similar product on Open Food Facts.
 */
export function ValueSources({ name, savedIngredients, onFill, undo }: ValueSourcesProps) {
  const [mode, setMode] = useState<Mode>('closed')
  const toggle = (next: Mode) => setMode((current) => (current === next ? 'closed' : next))

  function fill(filled: FilledValues) {
    onFill(filled)
    setMode('closed')
  }

  return (
    <section>
      <GroupedSection
        header="Fill in values"
        footer="No values on the package? Take them from a similar ingredient or product."
      >
        {savedIngredients.length > 0 && (
          <SourceRow
            label="Copy from an ingredient"
            open={mode === 'copy'}
            onClick={() => toggle('copy')}
          />
        )}
        <SourceRow
          label="Search Open Food Facts"
          open={mode === 'search'}
          onClick={() => toggle('search')}
        />
        {undo}
      </GroupedSection>
      {mode === 'copy' && (
        <IngredientPickList
          label="Search your ingredients"
          ingredients={savedIngredients}
          onPick={(ingredient) =>
            fill({
              values: toFormValues(ingredient),
              message: `Copied from ${ingredient.name}`,
              packagePortion: null,
            })
          }
        />
      )}
      {mode === 'search' && (
        <ProductSearchPanel
          initialQuery={name}
          onPick={(hit: ProductHit) =>
            fill({
              values: hit.values,
              message: `Filled in from ${hit.values.name}`,
              packagePortion: hit.info.portion,
            })
          }
        />
      )}
    </section>
  )
}
