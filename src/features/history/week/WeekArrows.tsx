import { Button } from '../../../components/ios/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/ios/icons'

type WeekArrowsProps = {
  readonly onPrevious: () => void
  readonly onNext: () => void
  /** there is no week after the running one */
  readonly nextDisabled: boolean
}

/** ‹ › in the navigation bar of the week page. */
export function WeekArrows({ onPrevious, onNext, nextDisabled }: WeekArrowsProps) {
  return (
    <div className="flex items-center">
      <Button
        variant="plain"
        className="grid h-11 w-11 place-items-center !p-0"
        aria-label="Previous week"
        onClick={onPrevious}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="plain"
        className="grid h-11 w-11 place-items-center !p-0"
        aria-label="Next week"
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}
