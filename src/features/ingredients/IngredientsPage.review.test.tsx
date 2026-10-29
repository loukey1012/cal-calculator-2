import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { finding } from '../review/testData'
import { ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  fetchIngredientUses: vi.fn().mockResolvedValue({}),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))
vi.mock('../review/reviewApi', () => ({
  fetchOpenFindings: vi.fn(),
  decideFinding: vi.fn(),
  patchIngredient: vi.fn(),
  mergeIngredients: vi.fn(),
}))
vi.mock('./applyToRecentMeals', () => ({ applyToRecentMeals: vi.fn() }))
vi.mock('../household/householdApi', () => ({
  updateProfile: vi.fn(),
  fetchMembers: vi.fn(),
}))

import {
  decideFinding,
  fetchOpenFindings,
  mergeIngredients,
  patchIngredient,
} from '../review/reviewApi'
import { applyToRecentMeals } from './applyToRecentMeals'
import { fetchMembers } from '../household/householdApi'
import { useLocation } from 'react-router'
import {
  deleteIngredient,
  fetchIngredients,
  fetchIngredientUses,
  updateIngredient,
} from './ingredientsApi'
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

const PARTNER = { ...PROFILE, id: 'u2', display_name: 'Anna' }
const NO_LUNCH = finding({
  id: 'm1',
  ingredient_id: null,
  user_id: 'u2',
  date: '2026-10-10',
  meal_type: 'lunch',
  kind: 'missing_meal',
  message: 'Breakfast and dinner are logged, but no lunch.',
  suggestion: {},
})
const LOW_DAY = finding({
  id: 'm2',
  ingredient_id: null,
  user_id: 'u1',
  date: '2026-10-09',
  kind: 'low_day',
  message: '640 kcal against a goal of 2000.',
  suggestion: {},
})

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname} {JSON.stringify(location.state)}
    </output>
  )
}

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <IngredientsPage />
      <LocationProbe />
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
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
})

describe('Ingredients › Review', () => {
  test('without open findings there is no Review button', async () => {
    vi.mocked(fetchOpenFindings).mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('button', { name: /Buter/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Review/ })).not.toBeInTheDocument()
  })

  test('the Review button sits on the title row next to +, not in the brand and sort line', async () => {
    renderPage()

    const review = await screen.findByRole('button', { name: 'Review: 2' })

    const titleRow = screen.getByRole('heading', { name: 'Ingredients' }).parentElement
    expect(titleRow).toContainElement(review)
    expect(titleRow).toContainElement(screen.getByRole('button', { name: 'Add ingredient' }))
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

  describe('an ingredient opened from its finding', () => {
    async function openMilkFromReview() {
      const { user, sheet } = await openReview(2)
      await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Open Milk' }))
      return { user, edit: await screen.findByRole('dialog', { name: 'Edit Ingredient' }) }
    }

    test('Close goes back to Review', async () => {
      const { user, edit } = await openMilkFromReview()
      expect(screen.queryByRole('dialog', { name: 'Review' })).not.toBeInTheDocument()

      await user.click(within(edit).getByRole('button', { name: 'Close' }))

      expect(await screen.findByRole('dialog', { name: 'Review' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Edit Ingredient' })).not.toBeInTheDocument()
    })

    test('Save goes back to Review with the findings refreshed', async () => {
      vi.mocked(updateIngredient).mockResolvedValue({ ...MILK, unit_weight_g: 250 })
      const { user, edit } = await openMilkFromReview()
      // the fixed unit weight is no longer a finding
      vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO])

      await user.click(within(edit).getByRole('button', { name: 'Save' }))

      const review = await screen.findByRole('dialog', { name: 'Review' })
      await waitFor(() =>
        expect(within(review).queryByRole('article', { name: /Milk/ })).not.toBeInTheDocument(),
      )
      expect(card(review, 'Buter')).toBeInTheDocument()
    })

    test('Delete goes back to Review and the finding of that ingredient is gone', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      vi.mocked(deleteIngredient).mockResolvedValue()
      const { user, edit } = await openMilkFromReview()
      vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO])

      await user.click(within(edit).getByRole('button', { name: 'Delete Ingredient' }))

      const review = await screen.findByRole('dialog', { name: 'Review' })
      await waitFor(() =>
        expect(within(review).queryByRole('article', { name: /Milk/ })).not.toBeInTheDocument(),
      )
    })
  })

  test('an ingredient opened from the list closes to the list', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Milk/ }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Edit Ingredient' })).getByRole('button', {
        name: 'Close',
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('a failed fix stays in the list with a message', async () => {
    vi.mocked(patchIngredient).mockRejectedValue(new Error('offline'))
    const { user, sheet } = await openReview(2)

    await user.click(within(card(sheet, 'Buter')).getByRole('button', { name: 'Apply fix' }))

    expect(await within(sheet).findByRole('alert')).toBeInTheDocument()
    expect(card(sheet, 'Buter')).toBeInTheDocument()
    expect(decideFinding).not.toHaveBeenCalled()
  })

  describe('meal findings', () => {
    beforeEach(() => vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO, NO_LUNCH, LOW_DAY]))

    test('are listed under Meals with the person, the day and the meal', async () => {
      const { sheet } = await openReview(3)

      expect(within(sheet).getByRole('heading', { name: 'Ingredients' })).toBeInTheDocument()
      expect(within(sheet).getByRole('heading', { name: 'Meals' })).toBeInTheDocument()
      // the partner by their nickname (default "baby"), yourself by your name
      const noLunch = within(sheet).getByRole('article', { name: /^baby/ })
      expect(noLunch).toHaveTextContent('Missing meal')
      expect(noLunch).toHaveTextContent('Lunch')
      expect(noLunch).toHaveTextContent('Breakfast and dinner are logged, but no lunch.')
      expect(within(sheet).getByRole('article', { name: /^Lukas/ })).toHaveTextContent('Low day')
    })

    test('Open day opens that person’s day in History', async () => {
      const { user, sheet } = await openReview(3)

      await user.click(
        within(within(sheet).getByRole('article', { name: /^baby/ })).getByRole('button', {
          name: 'Open day',
        }),
      )

      expect(screen.getByTestId('location')).toHaveTextContent(
        '/history/2026-10-10 {"person":"u2"}',
      )
      expect(screen.queryByRole('dialog', { name: 'Review' })).not.toBeInTheDocument()
    })

    test('Done and Ignore decide a meal finding; meals are never changed', async () => {
      const { user, sheet } = await openReview(3)
      vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO, LOW_DAY])

      await user.click(
        within(within(sheet).getByRole('article', { name: /^baby/ })).getByRole('button', {
          name: 'Done',
        }),
      )
      vi.mocked(fetchOpenFindings).mockResolvedValue([TYPO])
      await user.click(
        within(within(sheet).getByRole('article', { name: /^Lukas/ })).getByRole('button', {
          name: 'Ignore',
        }),
      )

      await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('m1', 'applied', 'u1'))
      await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('m2', 'ignored', 'u1'))
      expect(patchIngredient).not.toHaveBeenCalled()
    })

    test('with only one kind of finding there are no section titles', async () => {
      vi.mocked(fetchOpenFindings).mockResolvedValue([NO_LUNCH])
      const { sheet } = await openReview(1)

      expect(within(sheet).queryByRole('heading', { name: 'Meals' })).not.toBeInTheDocument()
    })
  })
})

describe('Ingredients › Review › merging a duplicate', () => {
  const WHOLE_MILK_ID = '8e4d6a9f-2c3b-4d4e-8f9a-1b2c3d4e5f6a'
  const WHOLE_MILK = ingredient({
    id: WHOLE_MILK_ID,
    name: 'Whole milk',
    kcal_100: 66,
    unit_label: 'glass',
    unit_weight_g: 250,
    barcode: '4012345678901',
  })
  const SAME_MILK = finding({
    id: 'f4',
    ingredient_id: 'milk',
    kind: 'duplicate',
    message: 'Looks like the same product as Whole milk.',
    suggestion: { duplicate_of: WHOLE_MILK_ID },
  })

  beforeEach(() => {
    vi.mocked(fetchIngredients).mockResolvedValue([BUTTER, MILK, WHOLE_MILK])
    vi.mocked(fetchOpenFindings).mockResolvedValue([SAME_MILK])
    vi.mocked(fetchIngredientUses).mockResolvedValue({ milk: 2, [WHOLE_MILK_ID]: 9 })
    vi.mocked(mergeIngredients).mockResolvedValue()
  })

  test('compares both: the one used more is kept, the rows that differ can be taken over', async () => {
    // Arrange
    const { user, sheet } = await openReview(1)

    // Act
    await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Compare' }))

    // Assert
    const keep = within(sheet).getByRole('group', { name: 'Which one to keep' })
    await waitFor(() =>
      expect(within(keep).getByRole('button', { name: /Keep Whole milk/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(within(keep).getByRole('button', { name: 'Keep Milk, used 2×' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      within(sheet).getByRole('button', { name: 'Take kcal / 100 from Milk: 64' }),
    ).toBeVisible()
    expect(within(sheet).queryByRole('button', { name: /Take Category/ })).not.toBeInTheDocument()
  })

  test('merges into the kept one with the values taken over, then the finding is gone', async () => {
    const { user, sheet } = await openReview(1)
    await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Compare' }))
    const keep = within(sheet).getByRole('group', { name: 'Which one to keep' })

    // keep the other one this time, and take its barcode
    await user.click(within(keep).getByRole('button', { name: 'Keep Milk, used 2×' }))
    await user.click(within(sheet).getByRole('button', { name: /Take Barcode from Whole milk/ }))
    // the server has the finding decided once merged
    vi.mocked(fetchOpenFindings).mockResolvedValue([])
    await user.click(within(sheet).getByRole('button', { name: 'Merge into Milk' }))

    await waitFor(() =>
      expect(mergeIngredients).toHaveBeenCalledWith({
        keepId: 'milk',
        dropId: WHOLE_MILK_ID,
        patch: { barcode: '4012345678901' },
        findingId: 'f4',
      }),
    )
    expect(await within(sheet).findByText('Nothing left to review.')).toBeInTheDocument()
  })

  test('not duplicates: the finding is ignored', async () => {
    const { user, sheet } = await openReview(1)
    await user.click(within(card(sheet, 'Milk')).getByRole('button', { name: 'Compare' }))

    await user.click(within(sheet).getByRole('button', { name: 'Not duplicates: ignore' }))

    await waitFor(() => expect(decideFinding).toHaveBeenCalledWith('f4', 'ignored', 'u1'))
    expect(mergeIngredients).not.toHaveBeenCalled()
  })

  test('a duplicate without the other ingredient has no Compare', async () => {
    vi.mocked(fetchOpenFindings).mockResolvedValue([DUPLICATE])
    const { sheet } = await openReview(1)

    expect(within(card(sheet, 'Milk')).queryByRole('button', { name: 'Compare' })).toBeNull()
  })
})
