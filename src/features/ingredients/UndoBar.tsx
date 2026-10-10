import { Button } from '../../components/ios/Button'

type UndoBarProps = {
  readonly message: string
  readonly onUndo: () => void
}

/** "Cleared 8 values · Undo", in place of the button that did it. */
export function UndoBar({ message, onUndo }: UndoBarProps) {
  return (
    <div className="flex items-center gap-3 py-1 pr-2 pl-4">
      <p role="status" className="flex-1 text-[15px] text-label-secondary">
        {message}
      </p>
      <Button variant="plain" onClick={onUndo}>
        Undo
      </Button>
    </div>
  )
}
