import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { ingredient } from './testData'

vi.mock('./ingredientsApi', () => ({
  fetchIngredients: vi.fn(),
  fetchIngredientUses: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue([]),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
}))
vi.mock('../review/reviewApi', () => ({ mergeIngredients: vi.fn() }))

import { ingredientKeys } from './hooks'
import { IngredientSheet } from './IngredientSheet'
import { fetchIngredients, fetchIngredientUses } from './ingredientsApi'
import { mergeIngredients } from '../review/reviewApi'
import { ApiError } from '../../lib/errors'
import { ingredientDraftKey, loadIngredientDraft, saveIngredientDraft } from './ingredientDraft'
import { EMPTY_INGREDIENT_FORM } from './ingredientForm'

const PUREE = ingredient({ id: 'p1', name: 'Pfanni Püree', brand: 'Pfanni', kcal_100: 350 })
const PUREE_TWIN = ingredient({ id: 'p2', name: 'Püree', brand: 'Pfanni', kcal_100: 340 })
const BUTTER = ingredient({ id: 'b1', name: 'Butter', kcal_100: 740 })

function renderSheet() {
  const onClose = vi.fn()
  const onMerged = vi.fn()
  const result = renderWithProviders(
    <IngredientSheet
      open
      householdId="h1"
      ingredient={PUREE}
      categories={[]}
      groups={[]}
      onClose={onClose}
      onOpenIngredient={vi.fn()}
      onMerged={onMerged}
    />,
  )
  return { ...result, onClose, onMerged }
}

async function openPicker() {
  const user = userEvent.setup()
  const view = renderSheet()
  await user.click(await screen.findByRole('button', { name: 'Merge with…' }))
  return { user, ...view }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(fetchIngredients).mockResolvedValue([PUREE, PUREE_TWIN, BUTTER])
  vi.mocked(fetchIngredientUses).mockResolvedValue({ p1: 1, p2: 5 })
  vi.mocked(mergeIngredients).mockResolvedValue()
})

describe('IngredientSheet › Merge with…', () => {
  test('a new ingredient has no Merge with…', () => {
    renderWithProviders(
      <IngredientSheet
        open
        householdId="h1"
        ingredient={null}
        categories={[]}
        groups={[]}
        onClose={vi.fn()}
        onOpenIngredient={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Merge with…' })).not.toBeInTheDocument()
  })

  test('the picker lists the others with their brand, not the ingredient itself', async () => {
    await openPicker()

    expect(await screen.findByRole('button', { name: /Butter/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /^Pfanni Püree\b/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^Pfanni Pfanni Püree/ })).not.toBeInTheDocument()
    // only the twin (brand Pfanni, name Püree) is offered
    expect(screen.getAllByText('Pfanni')).toHaveLength(1)
  })

  test('searching narrows the list', async () => {
    const { user } = await openPicker()
    await screen.findByRole('button', { name: /Butter/ })

    await user.type(screen.getByRole('searchbox'), 'but')

    expect(screen.getByRole('button', { name: /Butter/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^Pfanni Püree/ })).not.toBeInTheDocument()
  })

  test('Back returns to the form', async () => {
    const { user } = await openPicker()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Pfanni Püree')
    expect(screen.getByRole('button', { name: 'Merge with…' })).toBeVisible()
  })

  test('picking one compares the pair, without the ignore action', async () => {
    const { user } = await openPicker()

    await user.click(await screen.findByRole('button', { name: /Butter/ }))

    expect(await screen.findByRole('group', { name: 'Which one to keep' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Not duplicates/ })).not.toBeInTheDocument()
    // Back from the comparison leads to the picker
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Merge with…' })).toBeVisible()
  })

  test('merges with the chosen values and no finding, then closes with a message', async () => {
    const { user, onClose, onMerged, queryClient } = await openPicker()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    const group = await screen.findByRole('group', { name: 'Which one to keep' })
    await user.click(within(group).getByRole('button', { name: /^Keep Pfanni Püree/ }))
    await user.click(screen.getByRole('button', { name: /Take kcal \/ 100 from Butter/ }))

    await user.click(screen.getByRole('button', { name: 'Merge into Pfanni Püree' }))

    await waitFor(() =>
      expect(mergeIngredients).toHaveBeenCalledWith({
        keepId: 'p1',
        dropId: 'b1',
        patch: { kcal_100: 740 },
        findingId: null,
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    // the kept one as it is after the merge, with the values taken over
    expect(onMerged).toHaveBeenCalledWith({ ...PUREE, kcal_100: 740 }, true)
    const keys = invalidate.mock.calls.map(([filter]) => filter?.queryKey)
    expect(keys).toEqual(
      expect.arrayContaining([
        ingredientKeys.ingredients('h1'),
        ['ingredientUses', 'h1'],
        ['ingredientFindings', 'h1'],
        // everything holding the dropped ingredient's id
        ['day'],
        ['month'],
        ['dish'],
        ['leftovers'],
      ]),
    )
  })

  test('a failed merge shows the error and stays', async () => {
    vi.mocked(mergeIngredients).mockRejectedValue(new ApiError('Nope'))
    const { user, onClose } = await openPicker()
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    await user.click(await screen.findByRole('button', { name: /^Merge into/ }))

    expect(await screen.findByRole('alert')).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('merging without taking values over reports the kept one unchanged', async () => {
    const { user, onMerged } = await openPicker()
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    await user.click(await screen.findByRole('button', { name: /^Merge into/ }))

    await waitFor(() => expect(onMerged).toHaveBeenCalled())
    expect(onMerged.mock.calls[0]?.[1]).toBe(false)
  })

  test('the sheet is titled Merge while merging, and the view takes focus', async () => {
    const { user } = await openPicker()

    expect(await screen.findByRole('dialog', { name: 'Merge' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Merge with…' })).toHaveFocus()
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    expect(await screen.findByRole('heading', { name: 'Merge duplicates' })).toHaveFocus()
  })

  test('a merge clears what was typed for either ingredient, so it cannot overwrite the result', async () => {
    const { user } = await openPicker()
    const keptKey = ingredientDraftKey('h1', 'p1')
    const droppedKey = ingredientDraftKey('h1', 'b1')
    saveIngredientDraft(keptKey, { ...EMPTY_INGREDIENT_FORM, name: 'Old typing' })
    saveIngredientDraft(droppedKey, { ...EMPTY_INGREDIENT_FORM, name: 'Other typing' })
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    await user.click(await screen.findByRole('button', { name: /^Merge into/ }))

    await waitFor(() => expect(mergeIngredients).toHaveBeenCalled())
    await waitFor(() => expect(loadIngredientDraft(keptKey)).toBeNull())
    expect(loadIngredientDraft(droppedKey)).toBeNull()
  })

  test('a failed merge keeps the drafts', async () => {
    vi.mocked(mergeIngredients).mockRejectedValue(new ApiError('Nope'))
    const { user } = await openPicker()
    const keptKey = ingredientDraftKey('h1', 'p1')
    saveIngredientDraft(keptKey, { ...EMPTY_INGREDIENT_FORM, name: 'Typing' })
    await user.click(await screen.findByRole('button', { name: /Butter/ }))
    await user.click(await screen.findByRole('button', { name: /^Merge into/ }))

    await screen.findByRole('alert')
    expect(loadIngredientDraft(keptKey)).not.toBeNull()
  })
})

describe('IngredientSheet › Merge with… after typing', () => {
  async function typeAndMerge(confirmed: boolean) {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(confirmed)
    const user = userEvent.setup()
    renderSheet()
    await user.type(await screen.findByLabelText('Name'), ' XL')
    await user.click(screen.getByRole('button', { name: 'Merge with…' }))
    return { confirm }
  }

  test('asks before discarding unsaved changes and stays on the form when declined', async () => {
    const { confirm } = await typeAndMerge(false)

    expect(confirm).toHaveBeenCalledWith('Discard your unsaved changes?')
    expect(screen.getByLabelText('Name')).toHaveValue('Pfanni Püree XL')
    expect(loadIngredientDraft(ingredientDraftKey('h1', 'p1'))).not.toBeNull()
  })

  test('discards the typed changes and opens the picker when confirmed', async () => {
    await typeAndMerge(true)

    expect(await screen.findByRole('heading', { name: 'Merge with…' })).toBeVisible()
    expect(loadIngredientDraft(ingredientDraftKey('h1', 'p1'))).toBeNull()
  })

  test('does not ask when nothing was typed', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    await openPicker()

    expect(confirm).not.toHaveBeenCalled()
  })
})
