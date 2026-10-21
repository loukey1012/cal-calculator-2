import { Button } from './Button'

type BackButtonProps = {
  readonly onClick: () => void
  /** where Back leads, e.g. "Lunch"; shown as "‹ Lunch" */
  readonly label?: string
}

/** "‹ Back" above a step, e.g. in a sheet or on an Add food step. */
export function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <Button variant="plain" aria-label="Back" className="-ml-2" onClick={onClick}>
      ‹ {label}
    </Button>
  )
}
