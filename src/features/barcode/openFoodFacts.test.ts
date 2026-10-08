import { afterEach, describe, expect, test, vi } from 'vitest'
import { EMPTY_INGREDIENT_FORM } from '../ingredients/ingredientForm'
import { lookupProduct, productFormValues, type OffProduct } from './openFoodFacts'

const NUTELLA: OffProduct = {
  product_name: 'Nutella',
  product_name_de: 'Nutella',
  brands: 'Nutella, Ferrero',
  serving_quantity: 15,
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    sugars_100g: 56.3,
    fat_100g: 30.9,
    'saturated-fat_100g': 10.6,
    fiber_100g: 0,
    salt_100g: 0.107,
  },
}

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

afterEach(() => vi.unstubAllGlobals())

describe('productFormValues', () => {
  test('fills name, brand and the values per 100 g; a serving becomes the unit', () => {
    expect(productFormValues(NUTELLA, '3017620422003')).toEqual({
      ...EMPTY_INGREDIENT_FORM,
      name: 'Nutella',
      brand: 'Nutella',
      barcode: '3017620422003',
      per100gEnabled: true,
      per100g: {
        kcal: '539',
        protein: '6.3',
        carbs: '57.5',
        sugar: '56.3',
        fat: '30.9',
        sat_fat: '10.6',
        fiber: '0',
        salt: '0.11',
      },
      unitLabel: 'Portion',
      unitWeightG: '15',
    })
  })

  test('unknown values stay empty instead of a false 0; kJ give the calories if needed', () => {
    const values = productFormValues(
      { product_name: 'Bread', nutriments: { 'energy-kj_100g': 1046 } },
      '96385074',
    )

    expect(values.per100g).toMatchObject({ kcal: '250', protein: '', salt: '' })
    expect(values).toMatchObject({ brand: '', unitLabel: '', unitWeightG: '' })
  })

  test('empty or null values from Open Food Facts are unknown, not 0', () => {
    const values = productFormValues(
      {
        product_name: 'Juice',
        nutriments: { 'energy-kcal_100g': '', 'energy-kj_100g': 188, proteins_100g: null },
      },
      '96385074',
    )

    expect(values.per100g).toMatchObject({ kcal: '45', protein: '' })
  })

  test('the German name is preferred; without any calories the section stays off', () => {
    const values = productFormValues(
      { product_name: 'Oat drink', product_name_de: 'Haferdrink', nutriments: {} },
      '96385074',
    )

    expect(values).toMatchObject({ name: 'Haferdrink', per100gEnabled: false })
  })

  test('names and brands are cut to what the form allows', () => {
    const values = productFormValues(
      { product_name: 'x'.repeat(150), brands: 'y'.repeat(80) },
      '96385074',
    )

    expect(values.name).toHaveLength(100)
    expect(values.brand).toHaveLength(60)
  })
})

describe('lookupProduct', () => {
  test('a found product comes back as form values', async () => {
    const fetch = respond(200, { status: 1, product: NUTELLA })
    vi.stubGlobal('fetch', fetch)

    const result = await lookupProduct('3017620422003')

    expect(result).toMatchObject({ kind: 'found', values: { name: 'Nutella' } })
    expect(String(fetch.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/3017620422003\?fields=/,
    )
  })

  test('an unknown product is not found', async () => {
    vi.stubGlobal('fetch', respond(404, { status: 0, status_verbose: 'product not found' }))

    await expect(lookupProduct('96385074')).resolves.toEqual({ kind: 'notFound' })
  })

  test('offline, a server error or an odd answer leave the form empty instead of failing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')))
    await expect(lookupProduct('96385074')).resolves.toEqual({ kind: 'unavailable' })

    vi.stubGlobal('fetch', respond(503, {}))
    await expect(lookupProduct('96385074')).resolves.toEqual({ kind: 'unavailable' })

    vi.stubGlobal('fetch', respond(200, { status: 1, product: { nutriments: 'nope' } }))
    await expect(lookupProduct('96385074')).resolves.toEqual({ kind: 'unavailable' })
  })

  test('gives up after a few seconds', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('', 'AbortError')),
            ),
          ),
      ),
    )

    const result = lookupProduct('96385074')
    await vi.advanceTimersByTimeAsync(8000)

    await expect(result).resolves.toEqual({ kind: 'unavailable' })
    vi.useRealTimers()
  })
})
