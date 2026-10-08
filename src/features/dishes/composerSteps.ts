import { useState } from 'react'
import { ALL_CATEGORIES, type IngredientFilter } from '../ingredients/listing'

/** Where the dish composer is: the dish itself, or one of the steps of adding or editing a line. */
export type ComposerStep =
  | { readonly kind: 'main' }
  | { readonly kind: 'pick' }
  | { readonly kind: 'custom' }
  /** creating an ingredient that isn't in the database yet */
  | { readonly kind: 'newIngredient' }
  | { readonly kind: 'newLine'; readonly ingredientId: string }
  | { readonly kind: 'editLine'; readonly lineId: string }

export const MAIN_STEP: ComposerStep = { kind: 'main' }

/** what a new ingredient search starts with */
export const NO_FILTER: IngredientFilter = { query: '', category: ALL_CATEGORIES }

/**
 * Moving between the composer's steps. On the Cook tab each step is a page of its own (so a back
 * swipe works); in the dish editor sheet they are a history kept in the sheet.
 */
export type ComposerSteps = {
  readonly step: ComposerStep
  /** one step further, e.g. from the search to the amount */
  readonly open: (step: ComposerStep) => void
  /** in place of the step shown, e.g. the amount of an ingredient just created */
  readonly replace: (step: ComposerStep) => void
  /** one step back */
  readonly back: () => void
  /** straight back to the dish, e.g. after adding a line */
  readonly finish: () => void
  /** the ingredient search and category, kept while going to the amount and back */
  readonly filter: IngredientFilter
  readonly onFilter: (filter: IngredientFilter) => void
}

/** Identifies a step, e.g. to notice that another one is shown. */
export function stepKey(step: ComposerStep): string {
  switch (step.kind) {
    case 'newLine':
      return `newLine:${step.ingredientId}`
    case 'editLine':
      return `editLine:${step.lineId}`
    default:
      return step.kind
  }
}

/** The steps as a history inside one component, e.g. the dish editor sheet. */
export function useLocalComposerSteps(): ComposerSteps {
  const [history, setHistory] = useState<readonly ComposerStep[]>([])
  const [filter, setFilter] = useState(NO_FILTER)
  return {
    step: history.at(-1) ?? MAIN_STEP,
    open: (step) => {
      // every search starts over
      if (step.kind === 'pick') setFilter(NO_FILTER)
      setHistory((current) => [...current, step])
    },
    replace: (step) => setHistory((current) => [...current.slice(0, -1), step]),
    back: () => setHistory((current) => current.slice(0, -1)),
    finish: () => setHistory([]),
    filter,
    onFilter: setFilter,
  }
}
