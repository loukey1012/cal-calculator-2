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
  // the version being edited: a newer one arriving meanwhile (e.g. a partner's save) is only
  // offered, never swapped in under the draft
  const [opened, setOpened] = useState<Dish | null>(null)
  const latest = existing.data
  if (latest && opened?.id !== latest.id) setOpened(latest)

  if (existing.isError) return <ErrorBanner message={toUserMessage(existing.error)} />
  if (latest === undefined) return <Message text="Loading…" />
  if (latest === null) return <Message text="This dish was deleted." />
  const editing = opened?.id === latest.id ? opened : latest
  return (
    <DishForm
      key={editing.revision}
      initial={editing}
      hasNewerVersion={latest.revision !== editing.revision}
      onLoadNewerVersion={() => setOpened(latest)}
      people={people}
      date={date}
      onDone={onDone}
    />
  )
}

type DishFormProps = {
  readonly initial: Dish
  /** someone saved the dish after this edit started */
  readonly hasNewerVersion: boolean
  readonly onLoadNewerVersion: () => void
  readonly people: readonly Profile[]
  readonly date: string
  readonly onDone: () => void
}

const NEWER_VERSION_ERROR =
  'This dish was updated on another phone. Load the changes, then make your edit again.'

function NewerVersionNotice({ onLoad }: { readonly onLoad: () => void }) {
  return (
    <div
      role="status"
      className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-bg-elevated py-1 pr-2 pl-4 text-[15px] shadow-card"
    >
      <span className="text-label-secondary">Updated on another phone</span>
      <Button variant="plain" onClick={onLoad}>
        Load changes
      </Button>
    </div>
  )
}

function DishForm({
  initial,
  hasNewerVersion,
  onLoadNewerVersion,
  people,
  date,
  onDone,
}: DishFormProps) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  // my own save updates the cached dish too: no notice while the editor closes
  const [isSaved, setIsSaved] = useState(false)
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
    // sent anyway, the server would refuse it after the editor closed, losing this draft
    if (hasNewerVersion) return setError(NEWER_VERSION_ERROR)
    const problem = saveError(draft)
    if (problem) return setError(problem)
    try {
      saveDish.save({ dish: draft, baseRevision: initial.revision })
      setIsSaved(true)
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
      header={
        <>
          {hasNewerVersion && !isSaved && <NewerVersionNotice onLoad={onLoadNewerVersion} />}
          <WhoEatsSection dish={draft} people={people} date={date} onChange={change} />
        </>
      }
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
