import { Button } from './Button'

/** "‹ Back" above a step, e.g. in a sheet or on a Cook step. */
export function BackButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button variant="plain" aria-label="Back" className="-ml-2" onClick={onClick}>
      ‹ Back
    </Button>
  )
}
