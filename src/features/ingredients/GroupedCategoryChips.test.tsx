import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { GroupedCategoryChips } from './GroupedCategoryChips'
import { ALL_CATEGORIES, type CategoryFilter, type ChipGroup } from './listing'
import { category } from './testData'

const GROUPS: readonly ChipGroup[] = [
  {
    id: 'g1',
    name: 'Dairy & Spreads',
    categories: [category('c1', 'Dairy', 'g1'), category('c2', 'Spreads', 'g1')],
  },
  { id: 'g2', name: 'Fresh', categories: [category('c3', 'Meat & Fish', 'g2')] },
  { id: null, name: 'Other', categories: [] },
]

function renderChips(filter: CategoryFilter = ALL_CATEGORIES) {
  const onChange = vi.fn()
  const result = render(
    <GroupedCategoryChips groups={GROUPS} filter={filter} onChange={onChange} />,
  )
  return { ...result, onChange }
}

const broad = () => within(screen.getByRole('group', { name: 'Categories' }))
const panel = (name: string) => screen.queryByRole('group', { name: `${name} categories` })

describe('GroupedCategoryChips', () => {
  test('shows All and the broad categories, wrapping instead of scrolling sideways', () => {
    renderChips()

    const group = screen.getByRole('group', { name: 'Categories' })
    expect(group).toHaveClass('flex-wrap')
    expect(group).not.toHaveClass('overflow-x-auto')
    expect(
      broad()
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual(['All', 'Dairy & Spreads', 'Fresh', 'Other'])
    expect(broad().getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('tapping a broad category filters by it and opens its categories', async () => {
    const user = userEvent.setup()
    const { onChange } = renderChips()

    await user.click(broad().getByRole('button', { name: 'Dairy & Spreads' }))

    expect(onChange).toHaveBeenCalledWith({ kind: 'group', id: 'g1' })
    expect(broad().getByRole('button', { name: 'Dairy & Spreads' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const open = within(panel('Dairy & Spreads') as HTMLElement)
    expect(open.getAllByRole('button').map((chip) => chip.textContent)).toEqual([
      'All Dairy & Spreads',
      'Dairy',
      'Spreads',
    ])
  })

  test('a category in the panel filters by just that category', async () => {
    const user = userEvent.setup()
    const { onChange } = renderChips({ kind: 'group', id: 'g1' })
    await user.click(broad().getByRole('button', { name: 'Dairy & Spreads' }))
    onChange.mockClear()

    await user.click(
      within(panel('Dairy & Spreads') as HTMLElement).getByRole('button', { name: 'Spreads' }),
    )

    expect(onChange).toHaveBeenCalledWith({ kind: 'category', id: 'c2' })
  })

  test('the selected category and its broad category show as selected', () => {
    renderChips({ kind: 'category', id: 'c3' })

    expect(broad().getByRole('button', { name: 'Fresh' })).toHaveAttribute('aria-pressed', 'true')
    expect(broad().getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('tapping the open broad category again closes its panel', async () => {
    const user = userEvent.setup()
    renderChips()
    const fresh = broad().getByRole('button', { name: 'Fresh' })

    await user.click(fresh)
    await user.click(fresh)

    expect(panel('Fresh')).not.toBeInTheDocument()
    expect(fresh).toHaveAttribute('aria-expanded', 'false')
  })

  test('only one panel is open at a time', async () => {
    const user = userEvent.setup()
    renderChips()

    await user.click(broad().getByRole('button', { name: 'Fresh' }))
    await user.click(broad().getByRole('button', { name: 'Dairy & Spreads' }))

    expect(panel('Fresh')).not.toBeInTheDocument()
    expect(panel('Dairy & Spreads')).toBeInTheDocument()
  })

  test('All resets the filter and closes the panel', async () => {
    const user = userEvent.setup()
    const { onChange } = renderChips({ kind: 'group', id: 'g2' })
    await user.click(broad().getByRole('button', { name: 'Fresh' }))

    await user.click(broad().getByRole('button', { name: 'All' }))

    expect(onChange).toHaveBeenLastCalledWith(ALL_CATEGORIES)
    expect(panel('Fresh')).not.toBeInTheDocument()
  })

  test('a broad category without categories (Other, only uncategorized) opens no panel', async () => {
    const user = userEvent.setup()
    const { onChange } = renderChips()

    await user.click(broad().getByRole('button', { name: 'Other' }))

    expect(onChange).toHaveBeenCalledWith({ kind: 'group', id: null })
    expect(panel('Other')).not.toBeInTheDocument()
  })

  test('can start with a panel open (for the Appearance preview)', () => {
    render(
      <GroupedCategoryChips
        groups={GROUPS}
        filter={ALL_CATEGORIES}
        onChange={() => {}}
        initialOpenId="g1"
      />,
    )

    expect(panel('Dairy & Spreads')).toBeInTheDocument()
  })
})
