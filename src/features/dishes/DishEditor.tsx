import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { usePeople } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import { confirmDeleteDish } from './confirmDelete'
import { DishComposer } from './DishComposer'
import { useDeleteDish, useDish, useSaveDish } from './hooks'
import { portionName } from './portionName'
import type { Dish } from './portions'
import { saveError } from './saveError'
import { WhoEatsSection } from './WhoEatsSection'

type DishEditorProps = {
  readonly dishId: string
  /** the day the editor was opened from: someone added eats on it */
  readonly date: string
  readonly onDone: () => void
}

function Message({ text }: { readonly text: string }) {
  return <p className="mt-6 text-center text-[15px] text-label-secondary">{text}</p>
}

/** A saved dish, loaded for editing from one of its meals. */
export function DishEditor({ dishId, date, onDone }: DishEditorProps) {
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const existing = useDish(dishId)

  if (existing.isError) return <ErrorBanner message={toUserMessage(existing.error)} />
  if (existing.isPending) return <Message text="Loading…" />
  if (existing.data === null) return <Message text="This dish was deleted." />
  return (
    <DishForm key={dishId} initial={existing.data} people={people} date={date} onDone={onDone} />
  )
}

type DishFormProps = {
  readonly initial: Dish
  readonly people: readonly Profile[]
  readonly date: string
  readonly onDone: () => void
}

function DishForm({ initial, people, date, onDone }: DishFormProps) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const saveDish = useSaveDish()
  const deleteDish = useDeleteDish()
  const lookOf = useLookOf()
  const nameOf = (portionId: string) =>
    portionName(draft, people, (person) => lookOf(person).name, portionId)
  const change = (next: Dish) => {
    setDraft(next)
    setError(null)
  }

  function save() {
    const problem = saveError(draft)
    if (problem) return setError(problem)
    try {
      saveDish.save({ dish: draft })
      onDone()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This dish can’t be saved.')
    }
  }

  function remove() {
    if (!confirmDeleteDish(initial.portions.length)) return
    deleteDish.remove(initial.id)
    onDone()
  }

  return (
    <DishComposer
      dish={draft}
      onChange={change}
      nameOf={nameOf}
      error={error}
      header={<WhoEatsSection dish={draft} people={people} date={date} onChange={change} />}
      actions={
        <>
          <Button onClick={save}>Save dish</Button>
          <Button variant="destructive" onClick={remove}>
            Delete dish
          </Button>
        </>
      }
    />
  )
}
