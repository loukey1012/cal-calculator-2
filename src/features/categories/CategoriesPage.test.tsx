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
  kcal_burned: null,
  appearance: {},
  created_at: '',
  updated_at: '',
}
const GROUPS = [
  categoryGroup('g2', 'Pantry'),
  categoryGroup('g1', 'Fresh'),
  categoryGroup('g3', 'Empty'),
]
const CATEGORIES = [
  category('c1', 'Meat', 'g1'),
  category('c2', 'Veggies', 'g1'),
  category('c3', 'Sauces', 'g2'),
  category('c4', 'Misc', 'g2'),
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
/** waits for the section to load */
const section = async (name: string) =>
  within(
    (
      await screen.findByRole('heading', { level: 2, name: new RegExp(`^${name}(, edit)?$`) })
    ).closest('section') as HTMLElement,
  )
const editGroup = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole('button', { name: `${name}, edit` }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCategoryGroups).mockResolvedValue(GROUPS)
  vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
  vi.mocked(fetchIngredients).mockResolvedValue(INGREDIENTS)
  vi.mocked(createCategoryGroup).mockResolvedValue(categoryGroup('g9', 'New'))
  vi.mocked(renameCategoryGroup).mockResolvedValue()
  vi.mocked(deleteCategoryGroup).mockResolvedValue()
  vi.mocked(createCategory).mockResolvedValue(category('c9', 'New', 'g2'))
  vi.mocked(updateCategory).mockResolvedValue()
  vi.mocked(deleteCategory).mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CategoriesPage', () => {
  test('lists each broad category with its categories, without a broad categories table', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument()
    await section('Fresh')
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Empty, edit', 'Fresh, edit', 'Pantry, edit'])
    expect(screen.queryByText('Broad categories')).not.toBeInTheDocument()
    expect((await section('Fresh')).getByRole('button', { name: /^Meat/ })).toHaveTextContent(
      '2 ingredients',
    )
    expect((await section('Pantry')).getByRole('button', { name: /^Misc/ })).toHaveTextContent(
      '0 ingredients',
    )
    expect((await section('Empty')).getByText('No categories yet')).toBeInTheDocument()
  })

  test('tapping a group header opens that group', async () => {
    const user = userEvent.setup()
    renderPage()

    await editGroup(user, 'Pantry')

    expect(dialog().getByLabelText('Name')).toHaveValue('Pantry')
  })

  test('New Broad Category sits at the bottom, after Add Category', async () => {
    renderPage()

    const addCategory = await screen.findByRole('button', { name: 'Add Category' })
    const newGroup = screen.getByRole('button', { name: 'New Broad Category' })

    expect(
      addCategory.compareDocumentPosition(newGroup) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Broad Category' })).not.toBeInTheDocument()
  })

  test('says so when there are no broad categories yet', async () => {
    vi.mocked(fetchCategoryGroups).mockResolvedValue([])
    vi.mocked(fetchCategories).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No broad categories yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Broad Category' })).toBeInTheDocument()
  })

  test('adds a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'New Broad Category' }))
    await user.type(dialog().getByLabelText('Name'), '  Snacks ')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createCategoryGroup).toHaveBeenCalledWith('h1', 'Snacks'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('renames a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await editGroup(user, 'Fresh')
    const name = dialog().getByLabelText('Name')
    expect(name).toHaveValue('Fresh')
    await user.clear(name)
    await user.type(name, 'Fresh Food')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(renameCategoryGroup).toHaveBeenCalledWith('g1', 'Fresh Food'))
  })

  test('an empty broad category can be deleted, after asking', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()

    await editGroup(user, 'Empty')
    await user.click(dialog().getByRole('button', { name: 'Delete Broad Category' }))

    expect(confirm).toHaveBeenCalledWith('Delete “Empty”?')
    await waitFor(() => expect(deleteCategoryGroup).toHaveBeenCalledWith('g3'))
  })

  test('a broad category with categories in it says to move them first, instead of deleting', async () => {
    const user = userEvent.setup()
    renderPage()

    await editGroup(user, 'Fresh')

    expect(
      dialog().getByText('To delete it, first move or delete its 2 categories.'),
    ).toBeInTheDocument()
    expect(
      dialog().queryByRole('button', { name: 'Delete Broad Category' }),
    ).not.toBeInTheDocument()
  })

  test('nothing is deleted when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderPage()

    await editGroup(user, 'Empty')
    await user.click(dialog().getByRole('button', { name: 'Delete Broad Category' }))

    expect(deleteCategoryGroup).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('adds a category inside a broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add Category' }))
    expect(dialog().getByLabelText('Broad category')).toHaveDisplayValue('Choose')
    await user.type(dialog().getByLabelText('Name'), 'Spices')
    await user.click(dialog().getByRole('button', { name: 'Save' }))
    expect(dialog().getByText('Choose a broad category')).toBeInTheDocument()
    expect(createCategory).not.toHaveBeenCalled()

    await user.selectOptions(dialog().getByLabelText('Broad category'), 'g2')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('h1', 'Spices', 'g2'))
  })

  test('moves a category to another broad category', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click((await section('Fresh')).getByRole('button', { name: /^Meat/ }))
    expect(dialog().getByLabelText('Broad category')).toHaveValue('g1')
    await user.selectOptions(dialog().getByLabelText('Broad category'), 'g2')
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('c1', { name: 'Meat', groupId: 'g2' }),
    )
  })

  test('an empty category can be deleted, after asking', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()

    await user.click((await section('Pantry')).getByRole('button', { name: /^Misc/ }))
    await user.click(dialog().getByRole('button', { name: 'Delete Category' }))

    expect(confirm).toHaveBeenCalledWith('Delete “Misc”?')
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('c4'))
  })

  test('a category with ingredients says to move them first, instead of deleting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click((await section('Fresh')).getByRole('button', { name: /^Meat/ }))

    expect(
      dialog().getByText('To delete it, first move its 2 ingredients to another category.'),
    ).toBeInTheDocument()
    expect(dialog().queryByRole('button', { name: 'Delete Category' })).not.toBeInTheDocument()
  })

  test('an empty name is rejected without saving', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'New Broad Category' }))
    await user.click(dialog().getByRole('button', { name: 'Save' }))

    expect(dialog().getByText('Enter a name')).toBeInTheDocument()
    expect(createCategoryGroup).not.toHaveBeenCalled()
  })

  test('a name that is already taken is explained', async () => {
    vi.mocked(createCategoryGroup).mockRejectedValue(new ApiError('duplicate key', '23505'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'New Broad Category' }))
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
