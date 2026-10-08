import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { PageHeader } from '../../components/ios/PageHeader'
import { DishComposer } from '../dishes/DishComposer'
import { useSaveDish } from '../dishes/hooks'
import { portionName } from '../dishes/portionName'
import { saveError } from '../dishes/saveError'
import { useMembers, usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useToday } from '../today/useToday'
import { hasContent, keepEaters, resolvedDish, withDish, type CookDraft } from './cookDraft'
import { COOK_HOME, useCookSession } from './cookSessionContext'
import { CookWhoWhen } from './CookWhoWhen'
import { LeftoversCard } from './LeftoversCard'
import { useCookSteps } from './useCookSteps'
import { useMealOfDay } from './useMealOfDay'

const DISCARD_QUESTION = 'Discard this meal? Everything entered so far is removed.'

/**
 * The one place food is logged: alone or together, cooked or a single food. Each step of adding
 * an ingredient (search, amount) is a page of its own inside the Cook tab.
 */
export function CookPage() {
  const { profile, householdId } = useCurrentUser()
  const members = useMembers(householdId)
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const today = useToday()
  const mealOfDay = useMealOfDay()
  const navigate = useNavigate()
  const saveDish = useSaveDish()
  const { draft: storedDraft, setDraft, reset, returnTo, setReturnTo } = useCookSession()
  const steps = useCookSteps()
  const [error, setError] = useState<string | null>(null)

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
    setReturnTo(COOK_HOME)
    void navigate(returnTo, { replace: true })
  }

  function discard() {
    if (!window.confirm(DISCARD_QUESTION)) return
    reset()
    setError(null)
  }

  const onDish = steps.step.kind === 'main'
  return (
    <>
      {onDish ? (
        <>
          <PageHeader title="Cook" />
          <LeftoversCard today={today} mealOfDay={mealOfDay} />
        </>
      ) : (
        <div className="flex min-h-11 items-center pt-3 pb-2">
          <BackButton onClick={steps.back} />
        </div>
      )}
      <DishComposer
        // a fresh draft starts the form over
        key={draft.dish.id}
        dish={draft.dish}
        onChange={(dish) => change(withDish(draft, dish))}
        nameOf={nameOf}
        error={error}
        steps={steps}
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
