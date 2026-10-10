import { afterEach, describe, expect, test, vi } from 'vitest'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from '../ingredients/ingredientForm'
import {
  lookupProduct,
  productFormValues,
  productPrefill,
  searchProducts,
  type OffProduct,
} from './openFoodFacts'

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

afterEach(() => vi.unstubAllGlobals())

const COLA_BOTTLES: OffProduct = {
  product_name: 'Cola Bottles',
  product_name_de: 'Low Sugar Gummies Cola Bottles',
  brands: 'ahead',
  serving_quantity: 50,
  serving_quantity_unit: 'g',
  product_quantity: 50,
  nutriments: {
    'energy-kcal_100g': 142,
    'energy-kcal_serving': 71,
    proteins_100g: 5.6,
    proteins_serving: 2.8,
    carbohydrates_100g: 6.2,
    carbohydrates_serving: 3.1,
    sugars_100g: 1.3,
    sugars_serving: 0.65,
    fat_100g: 0.5,
    fat_serving: 0.25,
    'saturated-fat_100g': 0.1,
    'saturated-fat_serving': 0.05,
    fiber_100g: 47.3,
    fiber_serving: 23.6,
    salt_100g: 0.2,
    salt_serving: 0.1,
  },
}

const basis = (values: Partial<IngredientFormValues['per100g']>) => ({
  ...EMPTY_INGREDIENT_FORM.per100g,
  ...values,
})

describe('productFormValues', () => {
  test('fills name, brand, barcode, the values per 100 g and per portion as on the package', () => {
    expect(productPrefill(COLA_BOTTLES, '4260562940909')).toEqual({
      values: {
        ...EMPTY_INGREDIENT_FORM,
        name: 'Low Sugar Gummies Cola Bottles',
        brand: 'ahead',
        barcode: '4260562940909',
        per100gEnabled: true,
        per100g: {
          kcal: '142',
          protein: '5.6',
          carbs: '6.2',
          sugar: '1.3',
          fat: '0.5',
          sat_fat: '0.1',
          fiber: '47.3',
          salt: '0.2',
        },
        perUnitEnabled: true,
        perUnit: {
          kcal: '71',
          protein: '2.8',
          carbs: '3.1',
          sugar: '0.65',
          fat: '0.25',
          sat_fat: '0.05',
          fiber: '23.6',
          salt: '0.1',
        },
        unitLabel: '',
        unitWeightG: '50',
      },
      warnings: [],
      info: { imageUrl: null, portion: null, pack: null },
    })
  })

  test('what the package says is passed on: photo, portion and pack as printed', () => {
    const { info } = productPrefill(
      {
        ...COLA_BOTTLES,
        serving_size: '3 Stück (30 g)',
        quantity: ' 150 g ',
        image_front_small_url: 'https://images.openfoodfacts.org/images/products/1/front.200.jpg',
      },
      '4260562940909',
    )

    expect(info).toEqual({
      imageUrl: 'https://images.openfoodfacts.org/images/products/1/front.200.jpg',
      portion: '3 Stück (30 g)',
      pack: '150 g',
    })
  })

  test('a photo from anywhere but Open Food Facts’ image server is not shown', () => {
    const { info } = productPrefill(
      { ...COLA_BOTTLES, image_front_small_url: 'http://tracker.example/pixel.gif' },
      '4260562940909',
    )

    expect(info.imageUrl).toBeNull()
  })

  test('per-portion values missing: worked out from per 100 g and the portion weight', () => {
    const values = productFormValues(
      { serving_quantity: 40, nutriments: { 'energy-kcal_100g': 200, proteins_100g: 10 } },
      '96385074',
    )

    expect(values).toMatchObject({ perUnitEnabled: true, unitLabel: '', unitWeightG: '40' })
    expect(values.perUnit).toEqual(basis({ kcal: '80', protein: '4' }))
  })

  test('per-100 g values missing: worked out from the portion and its weight', () => {
    const values = productFormValues(
      {
        serving_quantity: 40,
        nutriments: { 'energy-kcal_serving': 80, proteins_serving: 4, proteins_100g: 9.5 },
      },
      '96385074',
    )

    // what the package states wins over what is worked out
    expect(values.per100g).toEqual(basis({ kcal: '200', protein: '9.5' }))
    expect(values.perUnit).toEqual(basis({ kcal: '80', protein: '4' }))
    expect(values.per100gEnabled).toBe(true)
  })

  test('per-portion values without a portion weight: per portion only, per 100 g stays empty', () => {
    const values = productFormValues(
      { nutriments: { 'energy-kcal_serving': 80, proteins_serving: 4 } },
      '96385074',
    )

    expect(values).toMatchObject({
      per100gEnabled: false,
      perUnitEnabled: true,
      unitLabel: '',
      unitWeightG: '',
    })
    expect(values.per100g).toEqual(basis({}))
    expect(values.perUnit).toEqual(basis({ kcal: '80', protein: '4' }))
  })

  test('no portion at all: per portion stays empty and off', () => {
    const values = productFormValues(
      { nutriments: { 'energy-kj_100g': 1046, proteins_100g: null } },
      '96385074',
    )

    expect(values.per100g).toMatchObject({ kcal: '250', protein: '', salt: '' })
    expect(values).toMatchObject({
      perUnitEnabled: false,
      perUnit: basis({}),
      brand: '',
      unitLabel: '',
      unitWeightG: '',
    })
  })

  test('a portion in another unit than grams is not used as a weight', () => {
    const values = productFormValues(
      {
        serving_quantity: 2,
        serving_quantity_unit: 'tbsp',
        nutriments: { 'energy-kcal_100g': 200 },
      },
      '96385074',
    )

    expect(values).toMatchObject({ perUnitEnabled: false, unitWeightG: '' })
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

  test('the German name is preferred; without any calories the sections stay off', () => {
    const values = productFormValues(
      { product_name: 'Oat drink', product_name_de: 'Haferdrink', nutriments: {} },
      '96385074',
    )

    expect(values).toMatchObject({ name: 'Haferdrink', per100gEnabled: false })
  })

  test('names get a capital first letter per word, the rest lowercase; brands stay as they are', () => {
    const values = productFormValues(
      { product_name_de: 'LOW SUGAR gummies coca-cola  7% fett', brands: 'AHEAD' },
      '96385074',
    )

    expect(values).toMatchObject({ name: 'Low Sugar Gummies Coca-Cola 7% Fett', brand: 'AHEAD' })
  })

  test('the unit name is left for you to choose (e.g. bar, pack)', () => {
    expect(productFormValues(COLA_BOTTLES, '4260562940909')).toMatchObject({
      unitLabel: '',
      unitWeightG: '50',
    })
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

describe('warnings about odd product data', () => {
  const warningsOf = (product: OffProduct) => productPrefill(product, '96385074').warnings

  test('a product that looks right has none', () => {
    expect(warningsOf(COLA_BOTTLES)).toEqual([])
  })

  test('a portion bigger than the whole pack', () => {
    expect(warningsOf({ ...COLA_BOTTLES, serving_quantity: 100 })).toContainEqual(
      expect.stringMatching(/portion \(100 g\) is bigger than the pack \(50 g\)/),
    )
  })

  test('the pack size given only as text counts too', () => {
    const product = {
      ...COLA_BOTTLES,
      product_quantity: undefined,
      quantity: '50 g',
      serving_quantity: 100,
    }

    expect(warningsOf(product)).toContainEqual(
      expect.stringMatching(/bigger than the pack \(50 g\)/),
    )
    expect(warningsOf({ ...product, quantity: '6 x 50 g' })).not.toContainEqual(
      expect.stringMatching(/bigger than the pack/),
    )
  })

  test('no calories, or per-portion values without a portion weight', () => {
    expect(warningsOf({ product_name: 'Tea', nutriments: {} })).toContainEqual(
      expect.stringMatching(/No calories/),
    )
    expect(warningsOf({ nutriments: { 'energy-kcal_serving': 80 } })).toContainEqual(
      expect.stringMatching(/no portion weight/),
    )
  })
})

describe('lookupProduct', () => {
  test('a found product comes back as form values', async () => {
    const fetch = respond(200, { status: 1, product: COLA_BOTTLES })
    vi.stubGlobal('fetch', fetch)

    const result = await lookupProduct('3017620422003')

    expect(result).toMatchObject({
      kind: 'found',
      values: { name: 'Low Sugar Gummies Cola Bottles' },
      warnings: [],
    })
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

describe('searchProducts', () => {
  test('products found by name come back ready to fill the form, without unusable ones', async () => {
    const fetch = respond(200, {
      products: [
        { ...COLA_BOTTLES, code: '4260562940909' },
        { code: '111', product_name: 'No values', nutriments: {} },
        { code: '222', nutriments: { 'energy-kcal_100g': 50 } },
        'garbage',
      ],
    })
    vi.stubGlobal('fetch', fetch)

    const result = await searchProducts(' cola bottles ')

    expect(result).toMatchObject({
      kind: 'found',
      hits: [{ barcode: '4260562940909', values: { name: 'Low Sugar Gummies Cola Bottles' } }],
    })
    const url = new URL(String(fetch.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://world.openfoodfacts.org/cgi/search.pl')
    expect(url.searchParams.get('search_terms')).toBe('cola bottles')
  })

  test('too many searches are told apart from being offline', async () => {
    vi.stubGlobal('fetch', respond(429, {}))
    await expect(searchProducts('skyr')).resolves.toEqual({ kind: 'busy' })

    vi.stubGlobal('fetch', respond(503, {}))
    await expect(searchProducts('skyr')).resolves.toEqual({ kind: 'busy' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')))
    await expect(searchProducts('skyr')).resolves.toEqual({ kind: 'unavailable' })

    vi.stubGlobal('fetch', respond(200, { nope: true }))
    await expect(searchProducts('skyr')).resolves.toEqual({ kind: 'unavailable' })
  })
})
