import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { category, ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  createCategory: vi.fn(),
}))

import { fetchCategories, fetchIngredients } from './ingredientsApi'
import { IngredientsPage } from './IngredientsPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CATEGORIES = [category('c1', 'Dairy'), category('c2', 'Bakery')]
const INGREDIENTS = [
  ingredient({ id: 'cream', name: 'Cream 7%', brand: 'Milbona', category_id: 'c1', kcal_100: 92 }),
  ingredient({ id: 'cheese', name: 'Käse', category_id: 'c1', kcal_100: 350 }),
  ingredient({ id: 'bread', name: 'Bread', category_id: 'c2', kcal_100: 250 }),
]

function renderPage(appearance: Record<string, string> = {}) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: { ...PROFILE, appearance }, householdId: 'h1' }}>
      <IngredientsPage />
    </CurrentUserContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue(INGREDIENTS)
  vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
})

describe('IngredientsPage', () => {
  test('lists ingredients grouped by category with brand and calories', async () => {
    renderPage()

    expect(await screen.findByText('Cream 7%')).toBeInTheDocument()
    expect(fetchIngredients).toHaveBeenCalledWith('h1')
    expect(screen.getByRole('heading', { name: 'Bakery' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dairy' })).toBeInTheDocument()
    expect(screen.getByText('Milbona · 92 kcal / 100 g')).toBeInTheDocument()
  })

  test('searching filters by name, ignoring accents', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'kase')

    expect(screen.getByText('Käse')).toBeInTheDocument()
    expect(screen.queryByText('Cream 7%')).not.toBeInTheDocument()
  })

  test('category chips filter the list and can be reset', async () => {
    const user = userEvent.setup()
    renderPage()
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))

    await user.click(chips.getByRole('button', { name: 'Bakery' }))

    expect(chips.getByRole('button', { name: 'Bakery' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Käse')).not.toBeInTheDocument()

    await user.click(chips.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Käse')).toBeInTheDocument()
  })

  test('rapidly switching categories always keeps the header, search and results', async () => {
    const user = userEvent.setup()
    renderPage()
    const chips = within(await screen.findByRole('group', { name: 'Categories' }))

    for (const name of ['Dairy', 'Bakery', 'All', 'Bakery', 'Dairy', 'Bakery']) {
      await user.click(chips.getByRole('button', { name }))
    }

    expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search ingredients' })).toBeInTheDocument()
    expect(chips.getByRole('button', { name: 'Bakery' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Cream 7%')).not.toBeInTheDocument()
  })

  test('category chips scroll sideways on one line by default', async () => {
    renderPage()

    const chips = await screen.findByRole('group', { name: 'Categories' })

    expect(chips).toHaveClass('overflow-x-auto')
    expect(chips).not.toHaveClass('flex-wrap')
  })

  test('with "All on screen" the chips wrap into rows and never scroll sideways', async () => {
    const user = userEvent.setup()
    renderPage({ categoryLayout: 'wrap' })
    const group = await screen.findByRole('group', { name: 'Categories' })

    expect(group).toHaveClass('flex-wrap')
    expect(group).not.toHaveClass('overflow-x-auto')
    expect(group).not.toHaveAttribute('data-swipe-lock')

    await user.click(within(group).getByRole('button', { name: 'Bakery' }))
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Käse')).not.toBeInTheDocument()
  })

  test('says when nothing matches the search', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cream 7%')

    await user.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'pizza')

    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  test('shows an empty state before the first ingredient', async () => {
    vi.mocked(fetchIngredients).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No ingredients yet')).toBeInTheDocument()
  })

  test('shows a retryable error when loading fails', async () => {
    vi.mocked(fetchIngredients)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(INGREDIENTS)
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Cream 7%')).toBeInTheDocument()
  })

  test('the + button opens the new ingredient form', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.getByRole('dialog', { name: 'New Ingredient' })).toBeInTheDocument()
  })

  test('the form waits for the categories, so the category picker is never wrong', async () => {
    vi.mocked(fetchCategories).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('tapping an ingredient opens it for editing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Cream 7%/ }))

    const dialog = within(screen.getByRole('dialog', { name: 'Edit Ingredient' }))
    expect(dialog.getByLabelText('Name')).toHaveValue('Cream 7%')
  })
})
