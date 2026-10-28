import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useLocation } from 'react-router'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))
vi.mock('../review/reviewApi', () => ({ fetchOpenFindings: vi.fn().mockResolvedValue([]) }))
vi.mock('../household/householdApi', () => ({
  fetchMembers: vi.fn().mockResolvedValue([]),
  updateProfile: vi.fn(),
}))
vi.mock('../recipes/recipesApi', () => ({
  fetchRecipes: vi.fn(),
  saveRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))

import { fetchRecipes } from '../recipes/recipesApi'
import { testRecipe } from '../recipes/testData'
import { IngredientsPage } from './IngredientsPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  kcal_burned: null,
  appearance: {},
  created_at: '',
  updated_at: '',
}

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(route: string) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <IngredientsPage />
      <Path />
    </CurrentUserContext>,
    { route },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchRecipes).mockResolvedValue([testRecipe({ id: 'r1', name: 'Burgers' })])
})

describe('Ingredients › Recipes', () => {
  test('the second view lists the recipes; one opens on top, to manage, not to cook', async () => {
    const user = userEvent.setup()
    renderAt('/ingredients')

    await user.click(screen.getByRole('radio', { name: 'Recipes' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/ingredients/recipes')
    await user.click(await screen.findByRole('button', { name: /Burgers/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/ingredients/recipes/r1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Burgers' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cook this' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/ingredients\/recipes$/)
  })
})
