import { describe, expect, test } from 'vitest'
import { countRows, packChipOrder, type ChipSize } from './chipRows'

const ROW = 358
const GAP = 6

// the grouped chips on the user's iPhone (CSS px, measured from a 390 px wide screenshot)
const USER_GROUPS: readonly ChipSize[] = [
  { key: 'all', width: 41 },
  { key: 'Bread & Carbs', width: 111 },
  { key: 'Cooking', width: 77 },
  { key: 'Dairy & Spreads', width: 123 },
  { key: 'Fresh', width: 59 },
  { key: 'Meals', width: 61 },
  { key: 'Snacks & Drinks', width: 124 },
]

const widthsOf = (chips: readonly ChipSize[]) =>
  new Map(chips.map((chip) => [chip.key, chip.width]))
const rowsFor = (chips: readonly ChipSize[], order: readonly string[]) =>
  countRows(
    order.map((key) => widthsOf(chips).get(key) ?? 0),
    ROW,
    GAP,
  )

describe('countRows', () => {
  test('fills each row before starting the next, like flex-wrap', () => {
    expect(countRows([100, 100, 100], 310, 5)).toBe(1)
    expect(countRows([100, 100, 100], 309, 5)).toBe(2)
    expect(countRows([], 300, 5)).toBe(0)
  })
})

describe('packChipOrder', () => {
  test('the user’s grouped chips need 3 rows alphabetically but fit in 2', () => {
    expect(
      rowsFor(
        USER_GROUPS,
        USER_GROUPS.map((chip) => chip.key),
      ),
    ).toBe(3)

    const order = packChipOrder(USER_GROUPS, ROW, GAP)

    expect(rowsFor(USER_GROUPS, order)).toBe(2)
  })

  test('keeps the first chip ("All") first', () => {
    expect(packChipOrder(USER_GROUPS, ROW, GAP)[0]).toBe('all')
  })

  test('returns every chip exactly once', () => {
    const order = packChipOrder(USER_GROUPS, ROW, GAP)

    expect([...order].sort()).toEqual(USER_GROUPS.map((chip) => chip.key).sort())
  })

  test('keeps the given order when it already uses the fewest rows', () => {
    const chips = [
      { key: 'a', width: 100 },
      { key: 'b', width: 100 },
      { key: 'c', width: 100 },
    ]

    expect(packChipOrder(chips, ROW, GAP)).toEqual(['a', 'b', 'c'])
  })

  test('within a row the chips keep their given (alphabetical) order', () => {
    const order = packChipOrder(USER_GROUPS, ROW, GAP)
    const firstRow: string[] = []
    let used = -GAP
    for (const key of order) {
      const width = widthsOf(USER_GROUPS).get(key) ?? 0
      if (used + GAP + width > ROW) break
      used += GAP + width
      firstRow.push(key)
    }

    expect(firstRow.slice(1)).toEqual([...firstRow.slice(1)].sort((a, b) => a.localeCompare(b)))
  })

  test('is the same every time for the same chips', () => {
    expect(packChipOrder(USER_GROUPS, ROW, GAP)).toEqual(packChipOrder(USER_GROUPS, ROW, GAP))
  })

  test('a chip wider than the row gets a row of its own and nothing breaks', () => {
    const chips = [
      { key: 'all', width: 40 },
      { key: 'huge', width: 500 },
      { key: 'small', width: 50 },
    ]

    const order = packChipOrder(chips, ROW, GAP)

    expect(order[0]).toBe('all')
    expect(rowsFor(chips, order)).toBe(2)
  })

  test('13 wrapped category chips never need more rows than alphabetically', () => {
    // "All" + the 12 categories at the "All on screen" chip size
    const chips: readonly ChipSize[] = [
      { key: 'all', width: 41 },
      ...[
        ['Bread', 60],
        ['Carbs', 61],
        ['Dairy', 56],
        ['Drinks', 64],
        ['Ingredients', 98],
        ["McDonald's", 95],
        ['Meat & Fish', 96],
        ['Ready Meals', 103],
        ['Sauces', 70],
        ['Snacks', 69],
        ['Spreads', 76],
        ['Veggies & Fruit', 119],
      ].map(([key, width]) => ({ key: String(key), width: Number(width) })),
    ]
    const alphabetical = rowsFor(
      chips,
      chips.map((chip) => chip.key),
    )

    const packed = rowsFor(chips, packChipOrder(chips, ROW, GAP))

    expect(packed).toBeLessThanOrEqual(alphabetical)
  })

  test('without measurements (all widths 0) the order stays as given', () => {
    const chips = USER_GROUPS.map((chip) => ({ ...chip, width: 0 }))

    expect(packChipOrder(chips, 0, GAP)).toEqual(USER_GROUPS.map((chip) => chip.key))
  })
})
