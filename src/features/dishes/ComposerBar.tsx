import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { ComposeIcon, PlusIcon } from '../../components/ios/icons'
import type { ComposerSteps } from './composerSteps'

type ComposerBarProps = {
  readonly steps: ComposerSteps
  readonly onBack: () => void
}

/**
 * Back above a composer step. On the ingredient search also a + for a new ingredient (named after
 * the search, like the + on the Ingredients tab) and a pencil for a one-off custom item.
 */
export function ComposerBar({ steps, onBack }: ComposerBarProps) {
  return (
    <div className="flex min-h-11 items-center justify-between">
      <BackButton onClick={onBack} />
      {steps.step.kind === 'pick' && (
        <div className="-mr-2 flex items-center">
          <Button
            variant="plain"
            aria-label="Custom item"
            onClick={() => steps.open({ kind: 'custom' })}
          >
            <ComposeIcon className="h-6 w-6" />
          </Button>
          <Button
            variant="plain"
            aria-label="New ingredient"
            onClick={() => steps.open({ kind: 'newIngredient' })}
          >
            <PlusIcon className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  )
}
