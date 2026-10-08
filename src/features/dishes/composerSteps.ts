import { useState } from 'react'

/** Where the dish composer is: the dish itself, or one of the steps of adding or editing a line. */
export type ComposerStep =
  | { readonly kind: 'main' }
  | { readonly kind: 'pick' }
  | { readonly kind: 'custom' }
  | { readonly kind: 'newLine'; readonly ingredientId: string }
  | { readonly kind: 'editLine'; readonly lineId: string }

export const MAIN_STEP: ComposerStep = { kind: 'main' }

/**
 * Moving between the composer's steps. On the Cook tab each step is a page of its own (so a back
 * swipe works); in the dish editor sheet they are a history kept in the sheet.
 */
export type ComposerSteps = {
  readonly step: ComposerStep
  /** one step further, e.g. from the search to the amount */
  readonly open: (step: ComposerStep) => void
  /** one step back */
  readonly back: () => void
  /** straight back to the dish, e.g. after adding a line */
  readonly finish: () => void
  /** the ingredient search, kept while going to the amount and back */
  readonly search: string
  readonly onSearch: (query: string) => void
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
  const [search, setSearch] = useState('')
  return {
    step: history.at(-1) ?? MAIN_STEP,
    open: (step) => {
      // every search starts empty
      if (step.kind === 'pick') setSearch('')
      setHistory((current) => [...current, step])
    },
    back: () => setHistory((current) => current.slice(0, -1)),
    finish: () => setHistory([]),
    search,
    onSearch: setSearch,
  }
}
