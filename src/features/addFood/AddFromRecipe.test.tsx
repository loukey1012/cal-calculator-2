import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { QueryKey } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { ingredient } from '../ingredients/testData'

vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn().mockResolvedValue([]) }))
vi.mock('./draftNotice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./draftNotice')>()),
  sendDraftNotice: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn().mockResolvedValue([]),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../dishes/dishesApi', () => ({
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
  fetchLeftoverDishes: vi.fn().mockResolvedValue([]),
}))
vi.mock('../recipes/recipesApi', () => ({
  fetchRecipes: vi.fn(),
  saveRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))

import { fetchMembers } from '../household/householdApi'
import { saveDish } from '../dishes/dishesApi'
import { fetchIngredients } from '../ingredients/ingredientsApi'
import { gramsItem } from '../dishes/testData'
import { deleteRecipe, fetchRecipes, saveRecipe } from '../recipes/recipesApi'
import { pickedChoice, type Recipe } from '../recipes/recipeModel'
import { productLine, slot } from '../recipes/testData'
import { toLocalDateString } from '../../lib/dates'
import { MealRoute } from '../meals/MealPage'
import { foodPath, mealPageOf, mealPath, recipesPath } from '../meals/mealPages'
import { mealForTime } from './addFoodDraft'
import { AddFoodSession } from './AddFoodSession'

function profile(id: string, name: string) {
  return {
    id,
    household_id: 'h1',
    display_name: name,
    accent_color: '#007aff',
    appearance: {},
    created_at: '',
    updated_at: '',
  }
}
const ME = profile('u1', 'Lukas')
const HER = profile('u2', 'Lisa')

// the patty got leaner since the recipe was saved
const PATTY = ingredient({ id: 'patty', name: 'Patty', kcal_100: 200 })

const BURGERS: Recipe = {
  id: 'r-burgers',
  name: 'Burgers',
  splitMode: 'equal',
  cookedWeightG: null,
  kcalEstimated: false,
  portions: [
    { id: 'rp-me', userId: 'u1', splitValue: null },
    { id: 'rp-her', userId: 'u2', splitValue: null },
  ],
  slots: [
    slot('s-patty', [
      {
        id: 'rl-patty',
        allocation: 'shared',
        item: { ...gramsItem('Patty', 300, 240), ingredient_id: 'patty' },
        amounts: {},
      },
    ]),
  ],
}

const TOAST: Recipe = {
  id: 'r-toast',
  name: 'Toast',
  splitMode: 'equal',
  cookedWeightG: null,
  kcalEstimated: false,
  portions: [{ id: 'rp-me', userId: 'u1', splitValue: null }],
  slots: [
    slot(
      's-bread',
      [
        productLine('c-clever', 'clever', 'Toastbrot Clever', 60, 260),
        productLine('c-spar', 'spar', 'Toastbrot Spar', 60, 250),
      ],
      { pickedId: 'c-spar' },
    ),
    slot('s-frisch', [productLine('c-frisch', 'frisch', 'Frischkäse', 20, 200)], {
      optional: true,
      leftOut: true,
    }),
  ],
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

const currentPath = () => screen.getByTestId('path').textContent

/** My meal of the time of day, today, and its pages. */
const meal = () =>
  mealPath(
    { userId: 'u1', date: toLocalDateString(new Date()), mealType: mealForTime(new Date()) },
    'today',
  )
const food = () => foodPath(meal())
const recipes = () => recipesPath(meal())

function MealTab() {
  const page = mealPageOf(useLocation().pathname)
  return page ? <MealRoute page={page} /> : <p>Today page</p>
}

function renderAddFood(route = food(), cached: ReadonlyArray<readonly [QueryKey, unknown]> = []) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: ME, householdId: 'h1' }}>
      <AddFoodSession>
        <Routes>
          <Route path="/today/*" element={<MealTab />} />
        </Routes>
        <LocationProbe />
      </AddFoodSession>
    </CurrentUserContext>,
    { route, cached },
  )
}

async function addPatty(user: UserEvent, grams: string) {
  await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
  await user.click(await screen.findByRole('button', { name: /Patty/ }))
  await user.type(screen.getByLabelText('Amount'), grams)
  await user.click(screen.getByRole('button', { name: 'Add to dish' }))
}

function savedRecipe(): Recipe {
  const call = vi.mocked(saveRecipe).mock.calls.at(-1)
  if (!call) throw new Error('saveRecipe was not called')
  return call[0]
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue([PATTY])
  vi.mocked(fetchMembers).mockResolvedValue([ME, HER])
  vi.mocked(fetchRecipes).mockResolvedValue([BURGERS])
  vi.mocked(saveRecipe).mockResolvedValue()
  vi.mocked(deleteRecipe).mockResolvedValue()
})

afterEach(() => vi.restoreAllMocks())

describe('recipes in Add food', () => {
  test('the dish in Add food is saved as a named recipe', async () => {
    // Arrange
    const user = userEvent.setup()
    renderAddFood()
    await addPatty(user, '250')

    // Act
    await user.click(screen.getByRole('button', { name: 'Save as recipe' }))
    await user.type(screen.getByLabelText('Recipe name'), 'Patty plate')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    // Assert
    const recipe = savedRecipe()
    expect(recipe.name).toBe('Patty plate')
    expect(recipe.portions).toEqual([{ id: expect.any(String), userId: 'u1', splitValue: null }])
    expect(
      recipe.slots.map(pickedChoice).map((line) => [line.item.name, line.item.entered_amount]),
    ).toEqual([['Patty', 250]])
    expect(await screen.findByRole('button', { name: 'Save meal' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Recipe name')).not.toBeInTheDocument()
  })

  test('a recipe from the list fills Add food at current values, with everyone who eats it', async () => {
    // Arrange
    const user = userEvent.setup()
    renderAddFood(meal())

    // Act
    await user.click(await screen.findByRole('button', { name: 'Add from recipe' }))
    expect(currentPath()).toBe(`${recipes()}`)
    await user.click(await screen.findByRole('button', { name: /Burgers/ }))
    expect(currentPath()).toBe(`${recipes()}/r-burgers`)
    await user.click(await screen.findByRole('button', { name: 'Cook this' }))

    // Assert
    expect(currentPath()).toBe(food())
    // 300 g at 200 kcal per 100 g today, not the 240 saved with the recipe
    expect(await screen.findByText('600 kcal')).toBeInTheDocument()
    // the partner's default nickname
    expect(await screen.findByRole('button', { name: 'baby', pressed: true })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Burgers')).toBeInTheDocument()
  })

  test('a dish cooked from a recipe can update that recipe', async () => {
    // Arrange
    const user = userEvent.setup()
    renderAddFood(`${recipes()}/r-burgers`)
    await user.click(await screen.findByRole('button', { name: 'Cook this' }))
    await addPatty(user, '50')

    // Act
    await user.click(screen.getByRole('button', { name: 'Save as recipe' }))
    await user.click(screen.getByRole('button', { name: 'Update “Burgers”' }))

    // Assert
    const recipe = savedRecipe()
    expect(recipe.id).toBe('r-burgers')
    // the patty added on Cook joins as an optional line
    expect(recipe.slots).toHaveLength(2)
    expect(recipe.slots[1]).toMatchObject({ optional: true, leftOut: false })
  })

  test('choices of last time are offered in Add food, and logging teaches the recipe', async () => {
    // Arrange
    vi.mocked(fetchRecipes).mockResolvedValue([TOAST])
    const user = userEvent.setup()
    renderAddFood(`${recipes()}/r-toast`)
    await user.click(await screen.findByRole('button', { name: 'Cook this' }))

    // Act: Clever toast today, with Frischkäse
    const bread = await screen.findByRole('radiogroup', { name: 'Toastbrot Spar: product' })
    expect(within(bread).getByRole('radio', { name: 'Toastbrot Spar' })).toBeChecked()
    await user.click(within(bread).getByRole('radio', { name: 'Toastbrot Clever' }))
    const frisch = screen.getByRole('switch', { name: 'Frischkäse' })
    expect(frisch).toHaveAttribute('aria-checked', 'false')
    await user.click(frisch)
    await user.click(screen.getByRole('button', { name: 'Save meal' }))

    // Assert
    const logged = vi.mocked(saveDish).mock.calls.at(-1)?.[0].dish
    expect(logged?.lines.map((line) => line.item.name)).toEqual(['Toastbrot Clever', 'Frischkäse'])
    const learned = savedRecipe()
    expect(learned.id).toBe('r-toast')
    expect(learned.slots[0]?.pickedId).toBe('c-clever')
    expect(learned.slots[1]).toMatchObject({ optional: true, leftOut: false })
  })

  test('cooking a recipe asks before replacing a started dish', async () => {
    // Arrange
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderAddFood()
    await addPatty(user, '100')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(await screen.findByRole('button', { name: 'Add from recipe' }))
    await user.click(await screen.findByRole('button', { name: /Burgers/ }))

    // Act
    await user.click(await screen.findByRole('button', { name: 'Cook this' }))

    // Assert
    expect(confirm).toHaveBeenCalled()
    expect(currentPath()).toBe(`${recipes()}/r-burgers`)
  })

  test('Back goes from a recipe to the list, and from the list to the meal', async () => {
    const user = userEvent.setup()
    renderAddFood(`${recipes()}/r-burgers`)
    // the page is complete once the recipe has loaded
    await screen.findByRole('heading', { name: 'Burgers' })

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await vi.waitFor(() => expect(currentPath()).toBe(`${recipes()}`))
    await screen.findByRole('heading', { name: 'Recipes' })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await vi.waitFor(() => expect(currentPath()).toBe(meal()))
  })

  test('a recipe is renamed and deleted on its page', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAddFood(`${recipes()}/r-burgers`)
    const name = await screen.findByLabelText('Recipe name')

    // Act
    await user.clear(name)
    await user.type(name, 'Smash burgers')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    await user.click(screen.getByRole('button', { name: 'Delete recipe' }))

    // Assert
    expect(savedRecipe()).toMatchObject({ id: 'r-burgers', name: 'Smash burgers' })
    expect(vi.mocked(deleteRecipe).mock.calls.at(-1)?.[0]).toBe('r-burgers')
    await vi.waitFor(() => expect(currentPath()).toBe(`${recipes()}`))
  })

  test('on the recipe’s page a product is removed from a line, and a line made optional', async () => {
    // Arrange
    vi.mocked(fetchRecipes).mockResolvedValue([TOAST])
    const user = userEvent.setup()
    renderAddFood(`${recipes()}/r-toast`)

    // Act
    await user.click(
      await screen.findByRole('button', { name: /Toastbrot Clever or Toastbrot Spar/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Remove Toastbrot Clever' }))

    // Assert
    await vi.waitFor(() =>
      expect(savedRecipe().slots[0]?.choices.map((choice) => choice.id)).toEqual(['c-spar']),
    )
    await user.click(screen.getByRole('switch', { name: 'Optional' }))
    await vi.waitFor(() => expect(savedRecipe().slots[0]?.optional).toBe(true))
  })

  test('recipes kept on the phone by the version before choices don’t break the pages', async () => {
    // Arrange: the old shape had `lines`, no `slots`
    const { slots: _slots, ...withoutSlots } = BURGERS
    const old = { ...withoutSlots, lines: [] }

    // Act
    renderAddFood(`${recipes()}/r-burgers`, [[['recipes', 'h1'], [old]]])

    // Assert
    expect(await screen.findByRole('heading', { name: 'Burgers' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Patty/ })).toBeInTheDocument()
  })

  test('without recipes the list says how to make one', async () => {
    vi.mocked(fetchRecipes).mockResolvedValue([])

    renderAddFood(`${recipes()}`)

    expect(await screen.findByText('No recipes yet')).toBeInTheDocument()
  })

  test('the list shows each recipe with its size and calories', async () => {
    renderAddFood(`${recipes()}`)

    const row = await screen.findByRole('button', { name: /Burgers/ })
    expect(within(row).getByText('1 ingredient')).toBeInTheDocument()
    expect(within(row).getByText('600 kcal')).toBeInTheDocument()
  })
})
