import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { finding } from '../review/testData'
import { ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchIngredientUses: vi.fn().mockResolvedValue({}),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))
vi.mock('../review/reviewApi', () => ({
  fetchOpenFindings: vi.fn(),
  decideFinding: vi.fn(),
  patchIngredient: vi.fn(),
}))
vi.mock('./applyToRecentMeals', () => ({ applyToRecentMeals: vi.fn() }))
vi.mock('../household/householdApi', () => ({ updateProfile: vi.fn() }))

import { decideFinding, fetchOpenFindings, patchIngredient } from '../review/reviewApi'
import { applyToRecentMeals } from './applyToRecentMeals'
import { fetchIngredients } from './ingredientsApi'
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
const BUTTER = ingredient({ id: 'butter', name: 'Buter', brand: 'Kerrygold', kcal_100: 740 })
const MILK = ingredient({ id: 'milk', name: 'Milk', kcal_100: 64, unit_weight_g: 2500 })
const TYPO = finding({
  id: 'f1',
  ingredient_id: 'butter',
  kind: 'typo',
  message: 'The name looks misspelled.',
  suggestion: { name: 'Butter' },
})
const UNIT = finding({
  id: 'f2',
  ingredient_id: 'milk',
  kind: 'unit_weight',
  message: 'A glass of milk is about 250 ml, not 2500.',
  suggestion: { unit_weight_g: 250 },
})
const DUPLICATE = finding({
  id: 'f3',
  ingredient_id: 'milk',
  kind: 'duplicate',
  message: 'Looks like the same product as Whole milk.',
  suggestion: {},
})

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <IngredientsPage />
    </CurrentUserContext>,
  )
}

async function openReview(count: number) {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: `Review: ${count}` }))
  return { user, sheet: screen.getByRole('dialog', { name: 'Review' }) }
}

const card = (sheet: HTMLElement, name: string) =>
  within(sheet).getByRole('article', { name: new RegExp(name) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue([BUTTER, MILK])
  vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO, UNIT])
  vi.mocked(decideFinding).mockResolvedValue()
  vi.mocked(applyToRecentMeals).mockResolvedValue([])
})

describe('Ingredients › Review', () => {
  test('without open findings there is no Review button', async () => {
    vi.mocked(fetchOpenFindings).mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('button', { name: /Buter/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Review/ })).not.toBeInTheDocument()
  })

  test('lists each finding with its ingredient, reason and the suggested change', async () => {
    const { sheet } = await openReview(2)

    const typo = card(sheet, 'Buter')
    expect(typo).toHaveTextContent('Typo')
    expect(typo).toHaveTextContent('The name looks misspelled.')
    expect(typo).toHaveTextContent('Name')
    expect(typo).toHaveTextContent('Buter → Butter')
    expect(card(sheet, 'Milk')).toHaveTextContent('Unit weight2500 g → 250 g')
  })

  test('Apply fix changes the ingredient, marks the finding applied and updates recent meals', async () => {
    const fixed = { ...BUTTER, name: 'Butter' }
    vi.mocked(patchIngredient).mockResolvedValue(fixed)
    const { user, sheet } = await openReview(2)
    // what the database has once it is applied
    vi.mocked(fetchOpenFindings).mockResolvedValue([UNIT])

    await user.click(within(card(sheet, 'Buter')).getByRole('button', { name: 'Apply fix' }))

    expect(patchIngredient).toHaveBeenCalledWith('butter', { name: 'Butter' })
    await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('f1', 'applied', 'u1'))
    await waitFor(() => expect(applyToRecentMeals).toHaveBeenCalledWith(fixed, expect.any(String)))
    expect(within(sheet).queryByRole('article', { name: /Buter/ })).not.toBeInTheDocument()
  })

  test('Ignore marks the finding ignored and changes nothing', async () => {
    const { user, sheet } = await openReview(2)
    vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO])

    await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Ignore' }))

    await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('f2', 'ignored', 'u1'))
    expect(patchIngredient).not.toHaveBeenCalled()
    expect(within(sheet).queryByRole('article', { name: /Milk/ })).not.toBeInTheDocument()
  })

  test('a finding without a fix to apply can be marked done, or the ingredient opened', async () => {
    vi.mocked(fetchOpenFindings).mockResolvedValue([DUPLICATE])
    const { user, sheet } = await openReview(1)
    const duplicate = card(sheet, 'Milk')
    expect(within(duplicate).queryByRole('button', { name: 'Apply fix' })).not.toBeInTheDocument()

    await user.click(within(duplicate).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('f3', 'applied', 'u1'))
    expect(patchIngredient).not.toHaveBeenCalled()
  })

  test('the ingredient can be opened from its finding', async () => {
    const { user, sheet } = await openReview(2)

    await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Open Milk' }))

    expect(await screen.findByRole('dialog', { name: 'Edit Ingredient' })).toBeInTheDocument()
  })

  test('a failed fix stays in the list with a message', async () => {
    vi.mocked(patchIngredient).mockRejectedValue(new Error('offline'))
    const { user, sheet } = await openReview(2)

    await user.click(within(card(sheet, 'Buter')).getByRole('button', { name: 'Apply fix' }))

    expect(await within(sheet).findByRole('alert')).toBeInTheDocument()
    expect(card(sheet, 'Buter')).toBeInTheDocument()
    expect(decideFinding).not.toHaveBeenCalled()
  })
})
