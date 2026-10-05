import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { ApiError } from '../../lib/errors'
import { renderWithProviders } from '../../test/render'
import { category, categoryGroup, ingredient } from '../ingredients/testData'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryGroups: vi.fn(),
  createCategory: vi.fn(),
}))
vi.mock('./categoriesApi', () => ({
  createCategoryGroup: vi.fn(),
  renameCategoryGroup: vi.fn(),
  deleteCategoryGroup: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

import {
  createCategory,
  fetchCategories,
  fetchCategoryGroups,
  fetchIngredients,
} from '../ingredients/ingredientsApi'
import { SettingsPage } from '../settings/SettingsPage'
import {
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  renameCategoryGroup,
  updateCategory,
} from './categoriesApi'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const GROUPS = [categoryGroup('g2', 'Pantry'), categoryGroup('g1', 'Fresh')]
const CATEGORIES = [
  category('c1', 'Meat', 'g1'),
  category('c2', 'Veggies', 'g1'),
  category('c3', 'Sauces', 'g2'),
  category('c4', 'Misc', null),
]
const INGREDIENTS = [
  ingredient({ id: 'i1', name: 'Steak', category_id: 'c1', kcal_100: 1 }),
  ingredient({ id: 'i2', name: 'Chicken', category_id: 'c1', kcal_100: 1 }),
  ingredient({ id: 'i3', name: 'Ketchup', category_id: 'c3', kcal_100: 1 }),
]

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route: '/settings/categories' },
  )
}

const dialog = () => within(screen.getByRole('dialog'))
const section = (name: string) =>
  within(screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCategoryGroups).mockResolvedValue(GROUPS)
  vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
  vi.mocked(fetchIngredients).mockResolvedValue(INGREDIENTS)
  vi.mocked(createCategoryGroup).mockResolvedValue(categoryGroup('g9', 'New'))
  vi.mocked(renameCategoryGroup).mockResolvedValue()
  vi.mocked(deleteCategoryGroup).mockResolvedValue()
  vi.mocked(createCategory).mockResolvedValue(category('c9', 'New'))
  vi.mocked(updateCategory).mockResolvedValue()
  vi.mocked(deleteCategory).mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CategoriesPage', () => {
  test('lists the broad categories, then each one with its categories, Other last', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument()
    const broad = section('Broad categories')
    expect(await broad.findByRole('button', { name: /^Fresh/ })).toHaveTextContent('2 categories')
    expect(broad.getByRole('button', { name: /^Pantry/ })).toHaveTextContent('1 category')
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Broad categories', 'Fresh', 'Pantry', 'Other'])
    expect(section('Fresh').getByRole('button', { name: /^Meat/ })).toHaveTextContent(
      '2 ingredients',
    )
    expect(section('Other').getByRole('button', { name: /^Misc/ })).toHaveTextContent(
      '0 ingredients',
    )
  })

  test('adds a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add Broad Category' }))
    await user.type(dialog().getByLabelText('Name'), '  Snacks ')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createCategoryGroup).toHaveBeenCalledWith('h1', 'Snacks'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('renames a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await section('Broad categories').findByRole('button', { name: /^Fresh/ }))
    const name = dialog().getByLabelText('Name')
    expect(name).toHaveValue('Fresh')
    await user.clear(name)
    await user.type(name, 'Fresh Food')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(renameCategoryGroup).toHaveBeenCalledWith('g1', 'Fresh Food'))
  })

  test('deleting a broad category asks first and says its categories move to Other', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()

    await user.click(await section('Broad categories').findByRole('button', { name: /^Fresh/ }))
    await user.click(dialog().getByRole('button', { name: 'Delete Broad Category' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 categories move to Other'))
    await waitFor(() => expect(deleteCategoryGroup).toHaveBeenCalledWith('g1'))
  })

  test('nothing is deleted when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderPage()

    await user.click(await section('Broad categories').findByRole('button', { name: /^Fresh/ }))
    await user.click(dialog().getByRole('button', { name: 'Delete Broad Category' }))

    expect(deleteCategoryGroup).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('adds a category inside a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add Category' }))
    expect(dialog().getByLabelText('Broad category')).toHaveDisplayValue('None (Other)')
    await user.type(dialog().getByLabelText('Name'), 'Spices')
    await user.selectOptions(dialog().getByLabelText('Broad category'), 'g2')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('h1', 'Spices', 'g2'))
  })

  test('moves a category to another broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await section('Fresh').findByRole('button', { name: /^Meat/ }))
    expect(dialog().getByLabelText('Broad category')).toHaveValue('g1')
    await user.selectOptions(dialog().getByLabelText('Broad category'), 'g2')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('c1', { name: 'Meat', groupId: 'g2' }),
    )
  })

  test('deleting a category asks first and says how many ingredients lose it', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()

    await user.click(await section('Fresh').findByRole('button', { name: /^Meat/ }))
    await user.click(dialog().getByRole('button', { name: 'Delete Category' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 ingredients'))
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('c1'))
  })

  test('an empty name is rejected without saving', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add Broad Category' }))
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    expect(dialog().getByText('Enter a name')).toBeInTheDocument()
    expect(createCategoryGroup).not.toHaveBeenCalled()
  })

  test('a name that is already taken is explained', async () => {
    vi.mocked(createCategoryGroup).mockRejectedValue(new ApiError('duplicate key', '23505'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add Broad Category' }))
    await user.type(dialog().getByLabelText('Name'), 'fresh')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    expect(await dialog().findByText('That name is already taken.')).toBeInTheDocument()
  })

  test('says when the categories could not be loaded', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new TypeError('Load failed'))
    renderPage()

    expect(
      await screen.findByText(
        'No connection. Check your internet and try again.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
  })

  test('goes back to Settings', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })
})
