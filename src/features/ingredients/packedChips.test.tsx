import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CategoryChips } from './CategoryChips'
import { packChipOrder } from './chipRows'
import { GroupedCategoryChips } from './GroupedCategoryChips'
import { ALL_CATEGORIES, type ChipGroup } from './listing'
import { category } from './testData'

const ROW = 358
// gap-1.5
const GAP = 6

// widths of the grouped chips on the user's iPhone, by label
const WIDTHS: Record<string, number> = {
  All: 41,
  'Bread & Carbs': 111,
  Cooking: 77,
  'Dairy & Spreads': 123,
  Fresh: 59,
  Meals: 61,
  'Snacks & Drinks': 124,
}

const GROUPS: readonly ChipGroup[] = Object.keys(WIDTHS)
  .filter((name) => name !== 'All')
  .map((name) => ({ id: name, name, categories: [category(`c-${name}`, `${name} 1`, name)] }))

/** jsdom has no layout: give chips their measured widths, the chip row the iPhone's width and gap. */
function fakeLayout() {
  const realStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = realStyle(element, pseudo)
    if (element.getAttribute('role') !== 'group') return style
    // the real style (Testing Library reads it too), with the chip gap jsdom doesn't compute
    return new Proxy(style, {
      get(target, property) {
        if (property === 'columnGap') return `${GAP}px`
        const value: unknown = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return WIDTHS[this.textContent ?? ''] ?? 0
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.getAttribute('role') === 'group' ? ROW : 0
  })
}

const chipLabels = (group: HTMLElement) =>
  within(group)
    .getAllByRole('button')
    .map((chip) => chip.textContent)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('packed chip order', () => {
  test('grouped chips are arranged to fill as few rows as possible, All first', () => {
    fakeLayout()
    const expected = packChipOrder(
      Object.entries(WIDTHS).map(([key, width]) => ({ key, width })),
      ROW,
      GAP,
    )

    render(<GroupedCategoryChips groups={GROUPS} filter={ALL_CATEGORIES} onChange={() => {}} />)

    expect(chipLabels(screen.getByRole('group', { name: 'Categories' }))).toEqual(expected)
    expect(expected).not.toEqual(Object.keys(WIDTHS))
  })

  test('without measurements the chips stay alphabetical', () => {
    render(<GroupedCategoryChips groups={GROUPS} filter={ALL_CATEGORIES} onChange={() => {}} />)

    expect(chipLabels(screen.getByRole('group', { name: 'Categories' }))).toEqual(
      Object.keys(WIDTHS),
    )
  })

  test('"All on screen" chips are packed too', () => {
    fakeLayout()
    const categories = GROUPS.map((group) => category(group.name, group.name))

    render(
      <CategoryChips layout="wrap" categories={categories} selectedId={null} onSelect={() => {}} />,
    )

    const labels = chipLabels(screen.getByRole('group', { name: 'Categories' }))
    expect(labels[0]).toBe('All')
    expect(labels).not.toEqual(Object.keys(WIDTHS))
  })

  test('the one-line chips keep their order: they scroll instead of wrapping', () => {
    fakeLayout()
    const categories = GROUPS.map((group) => category(group.name, group.name))

    render(
      <CategoryChips layout="line" categories={categories} selectedId={null} onSelect={() => {}} />,
    )

    expect(chipLabels(screen.getByRole('group', { name: 'Categories' }))).toEqual(
      Object.keys(WIDTHS),
    )
  })
})
