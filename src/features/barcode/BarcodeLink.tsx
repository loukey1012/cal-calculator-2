import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useIngredients, useLinkBarcode } from '../ingredients/hooks'
import { IngredientPickList } from '../ingredients/IngredientPickList'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { likelyMatch } from './barcodeLink'

type BarcodeLinkProps = {
  /** the scanned barcode no ingredient has yet */
  readonly barcode: string
  /** the product's name and brand on Open Food Facts, if found */
  readonly productName: string
  readonly productBrand: string
  /** the ingredient now has the barcode; go on as if it had been found */
  readonly onLinked: (ingredient: Ingredient) => void
}

const label = (ingredient: Ingredient) =>
  ingredient.brand ? `${ingredient.name} (${ingredient.brand})` : ingredient.name

/**
 * Above the new-ingredient form of an unknown barcode: the package may be one already saved
 * without (or with another) barcode. Saving it there makes the next scan find it.
 */
export function BarcodeLink({ barcode, productName, productBrand, onLinked }: BarcodeLinkProps) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const link = useLinkBarcode(householdId)
  const [picking, setPicking] = useState(false)
  const list = ingredients.data ?? []
  if (list.length === 0) return null
  const suggestion = likelyMatch(list, productName, productBrand)

  function use(ingredient: Ingredient) {
    const replaces = ingredient.barcode !== null && ingredient.barcode !== barcode
    if (
      replaces &&
      !window.confirm(
        `“${ingredient.name}” already has a barcode (${ingredient.barcode}). Replace it with this one?`,
      )
    ) {
      return
    }
    link.mutate({ id: ingredient.id, barcode }, { onSuccess: (linked) => onLinked(linked) })
  }

  return (
    <div className="mb-3">
      {suggestion && (
        <div className="flex items-center gap-3 rounded-2xl bg-bg-elevated py-2 pr-2 pl-4 shadow-card">
          <p className="min-w-0 flex-1 text-[15px] font-semibold">Is this {label(suggestion)}?</p>
          <Button
            variant="plain"
            loading={link.isPending}
            aria-label={`Use ${suggestion.name}`}
            onClick={() => use(suggestion)}
          >
            Use it
          </Button>
        </div>
      )}
      <Button
        variant="plain"
        aria-expanded={picking}
        className="-ml-2 text-[15px]"
        onClick={() => setPicking((open) => !open)}
      >
        Add to an existing ingredient
      </Button>
      {picking && (
        <IngredientPickList label="Search your ingredients" ingredients={list} onPick={use} />
      )}
      {link.error && <ErrorBanner message={toUserMessage(link.error)} />}
    </div>
  )
}
