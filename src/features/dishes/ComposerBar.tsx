import { BackButton } from '../../components/ios/BackButton'
import { AddFoodMenu } from '../meals/AddFoodMenu'
import type { ComposerSteps } from './composerSteps'

type ComposerBarProps = {
  readonly steps: ComposerSteps
  readonly onBack: () => void
}

/** Back above a composer step; on the ingredient search also the + for a new or custom food. */
export function ComposerBar({ steps, onBack }: ComposerBarProps) {
  return (
    <div className="flex min-h-11 items-center justify-between">
      <BackButton onClick={onBack} />
      {steps.step.kind === 'pick' && (
        <AddFoodMenu
          name={steps.filter.query.trim()}
          onNew={() => steps.open({ kind: 'newIngredient' })}
          onCustom={() => steps.open({ kind: 'custom' })}
        />
      )}
    </div>
  )
}
