import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { usePagePath } from '../../app/pagePath'
import { MAIN_STEP, type ComposerStep, type ComposerSteps } from '../dishes/composerSteps'
import { cookStepOf, cookStepPath, parentStep } from './cookSteps'
import { useCookSession } from './cookSessionContext'

/** The Cook steps as pages: opening one pushes it, Back and a back swipe pop it. */
export function useCookSteps(): ComposerSteps {
  const path = usePagePath()
  const navigate = useNavigate()
  const { search, setSearch } = useCookSession()
  const step = useMemo(() => cookStepOf(path), [path])
  // like the Settings pages, steps build no browser history
  const go = (next: ComposerStep) => void navigate(cookStepPath(next), { replace: true })
  return {
    step,
    open: (next) => {
      // every search starts empty
      if (next.kind === 'pick') setSearch('')
      go(next)
    },
    back: () => go(parentStep(step)),
    finish: () => go(MAIN_STEP),
    search,
    onSearch: setSearch,
  }
}
