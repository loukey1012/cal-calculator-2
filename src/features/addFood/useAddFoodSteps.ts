import { useMemo } from 'react'
import { usePagePath } from '../../app/pagePath'
import { useStackNavigate } from '../../app/stackNavigate'
import {
  MAIN_STEP,
  NO_FILTER,
  type ComposerStep,
  type ComposerSteps,
} from '../dishes/composerSteps'
import { addFoodStepOf, addFoodStepPath, parentStep } from './addFoodSteps'
import { useAddFoodSession } from './addFoodSessionContext'

/** The Add food steps as pages below `base`: opening one pushes it, Back and a back swipe pop it. */
export function useAddFoodSteps(base: string): ComposerSteps {
  const path = usePagePath()
  const navigate = useStackNavigate()
  const { filter, setFilter } = useAddFoodSession()
  const step = useMemo(() => addFoodStepOf(path, base), [path, base])
  const go = (next: ComposerStep) => navigate(addFoodStepPath(next, base))
  return {
    step,
    open: (next) => {
      // every search starts over
      if (next.kind === 'pick') setFilter(NO_FILTER)
      go(next)
    },
    // a sibling address: shown at once, and Back leads where it led before
    replace: go,
    back: () => go(parentStep(step)),
    finish: () => go(MAIN_STEP),
    filter,
    onFilter: setFilter,
  }
}
