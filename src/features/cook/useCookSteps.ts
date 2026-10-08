import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { usePagePath } from '../../app/pagePath'
import {
  MAIN_STEP,
  NO_FILTER,
  type ComposerStep,
  type ComposerSteps,
} from '../dishes/composerSteps'
import { cookStepOf, cookStepPath, parentStep } from './cookSteps'
import { useCookSession } from './cookSessionContext'

/** The Cook steps as pages: opening one pushes it, Back and a back swipe pop it. */
export function useCookSteps(): ComposerSteps {
  const path = usePagePath()
  const navigate = useNavigate()
  const { filter, setFilter } = useCookSession()
  const step = useMemo(() => cookStepOf(path), [path])
  // like the Settings pages, steps build no browser history
  const go = (next: ComposerStep) => void navigate(cookStepPath(next), { replace: true })
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
