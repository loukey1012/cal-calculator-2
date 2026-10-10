import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ios/Button'
import type { IngredientFormValues } from '../ingredients/ingredientForm'
import { lookupProduct, type ProductInfo } from './openFoodFacts'

const MESSAGES = {
  notFound: 'This product isn’t in Open Food Facts yet.',
  unavailable: 'Couldn’t look the product up right now. Try again later.',
} as const

type BarcodeFillRowProps = {
  /** a valid barcode, as stored */
  readonly barcode: string
  /** fills in what's empty; a message when nothing was */
  readonly onFound: (product: IngredientFormValues, info: ProductInfo) => string | null
}

/** Looks the barcode up on Open Food Facts to fill in what's still empty. */
export function BarcodeFillRow({ barcode, onFound }: BarcodeFillRowProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // a changed barcode replaces this row: a late answer for the old one is dropped
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  async function fill() {
    setLoading(true)
    setMessage(null)
    const result = await lookupProduct(barcode)
    if (!active.current) return
    setLoading(false)
    setMessage(
      result.kind === 'found' ? onFound(result.values, result.info) : MESSAGES[result.kind],
    )
  }

  return (
    <div className="flex items-center gap-3 py-1 pr-2 pl-4">
      <p role="status" className="flex-1 text-[13px] text-label-secondary">
        {message}
      </p>
      <Button variant="plain" loading={loading} onClick={() => void fill()}>
        Fill empty values from Open Food Facts
      </Button>
    </div>
  )
}
