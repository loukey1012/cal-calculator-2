import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { PageHeader } from '../../components/ios/PageHeader'
import { DishComposer } from '../dishes/DishComposer'
import { useSaveDish } from '../dishes/hooks'
import { portionName } from '../dishes/portionName'
import { saveError } from '../dishes/saveError'
import { useMembers, usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useToday } from '../today/useToday'
import {
  hasContent,
  keepEaters,
  resolvedDish,
  withDish,
  withPrefill,
  type CookDraft,
} from './cookDraft'
import { parseCookLink } from './cookLink'
import { CookWhoWhen } from './CookWhoWhen'
import { LeftoversCard } from './LeftoversCard'
import { useCookDraft } from './useCookDraft'
import { useMealOfDay } from './useMealOfDay'

// after saving, unless Cook was opened from somewhere else
const HOME = '/today'
const DISCARD_QUESTION = 'Discard this meal? Everything entered so far is removed.'

/** The one place food is logged: alone or together, cooked or a single food. */
export function CookPage() {
  const { profile, householdId } = useCurrentUser()
  const members = useMembers(householdId)
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const today = useToday()
  const mealOfDay = useMealOfDay()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saveDish = useSaveDish()
  const { draft: storedDraft, setDraft, reset } = useCookDraft(profile.id)
  const [returnTo, setReturnTo] = useState(HOME)
  const [handledLink, setHandledLink] = useState('')
  const [error, setError] = useState<string | null>(null)

  // opened from an empty meal: take over its person, day and meal (once per link)
  const search = params.toString()
  if (search !== handledLink) {
    setHandledLink(search)
    const link = parseCookLink(params, today)
    if (link) {
      setDraft((current) => withPrefill(current, link.prefill, today))
      setReturnTo(link.returnTo)
    }
  }

  // someone who left the household can't eat along any more
  const memberIds = members.data && [profile.id, ...members.data.map((member) => member.id)]
  const draft = memberIds ? keepEaters(storedDraft, memberIds, profile.id) : storedDraft

  const change = (next: CookDraft) => {
    setDraft(next)
    setError(null)
  }
  const nameOf = (portionId: string) =>
    portionName(draft.dish, people, (person) => lookOf(person).name, portionId)

  function save() {
    const dish = resolvedDish(draft, today, mealOfDay)
    const problem = saveError(dish)
    if (problem) return setError(problem)
    try {
      saveDish.save({ dish })
    } catch (failure) {
      return setError(failure instanceof Error ? failure.message : 'This meal can’t be saved.')
    }
    reset()
    setError(null)
    setReturnTo(HOME)
    void navigate(returnTo, { replace: true })
  }

  function discard() {
    if (!window.confirm(DISCARD_QUESTION)) return
    reset()
    setError(null)
  }

  return (
    <>
      <PageHeader title="Cook" />
      <LeftoversCard today={today} mealOfDay={mealOfDay} />
      <DishComposer
        // a fresh draft starts the form over
        key={draft.dish.id}
        dish={draft.dish}
        onChange={(dish) => change(withDish(draft, dish))}
        nameOf={nameOf}
        error={error}
        header={
          <CookWhoWhen
            draft={draft}
            people={people}
            today={today}
            mealOfDay={mealOfDay}
            onChange={change}
          />
        }
        actions={
          <>
            <Button onClick={save}>Save meal</Button>
            {hasContent(draft) && (
              <Button variant="destructive" onClick={discard}>
                Discard
              </Button>
            )}
          </>
        }
      />
    </>
  )
}
