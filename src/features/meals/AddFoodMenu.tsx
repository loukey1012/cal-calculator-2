import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { PlusIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'

const TITLE = 'Add new'

type AddFoodMenuProps = {
  /** the name searched for, which a new ingredient starts with */
  readonly name: string
  readonly onNew: () => void
  readonly onCustom: () => void
}

/** The + above the ingredient search: a new ingredient, or a one-off custom item. */
export function AddFoodMenu({ name, onNew, onCustom }: AddFoodMenuProps) {
  const [open, setOpen] = useState(false)
  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <>
      <Button
        variant="plain"
        aria-label={TITLE}
        aria-haspopup="dialog"
        className="-mr-2"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="h-6 w-6" />
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={TITLE}>
        <GroupedSection>
          <ListRow
            title="New ingredient"
            subtitle={
              name ? `Save “${name}” to your ingredients` : 'Save a new one to your ingredients'
            }
            onClick={choose(onNew)}
          />
          <ListRow
            title="Custom item"
            subtitle="Quick one-off, not saved to your ingredients"
            onClick={choose(onCustom)}
          />
        </GroupedSection>
      </Sheet>
    </>
  )
}
