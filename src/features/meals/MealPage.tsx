import { useCurrentUser } from '../../app/currentUser'
import { useStackNavigate } from '../../app/stackNavigate'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { PageHeader } from '../../components/ios/PageHeader'
import { AddFoodPage } from '../addFood/AddFoodPage'
import { AddFromRecipePages } from '../addFood/AddFromRecipePages'
import { useAddFoodSession } from '../addFood/addFoodSessionContext'
import { usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useMealOfDay } from '../addFood/useMealOfDay'
import { useToday } from '../today/useToday'
import { formatShortDay } from '../trends/trendFormat'
import { mealLabel } from './dayModel'
import { useDay } from './hooks'
import { MealContent } from './MealContent'
import { MealLeftovers } from './MealLeftovers'
import { MealNoteRoute } from '../notes/NoteRoutes'
import { NoteEntryRow } from '../notes/NoteEntryRow'
import { mealNotePath } from '../notes/notePages'
import { foodPath, recipesPath, type MealPageRef } from './mealPages'
import { isDraftFor } from './unsavedDish'

/** A meal's page, or one of the pages below it (Add food and its steps, Add from recipe). */
export function MealRoute({ page }: { readonly page: MealPageRef }) {
  switch (page.page) {
    case 'food':
      return <AddFoodPage page={page} />
    case 'recipes':
      return <AddFromRecipePages page={page} />
    case 'note':
      return <MealNoteRoute page={page} />
    case 'meal':
      return <MealPage page={page} />
  }
}

/** The page Back leads to from a meal: Today, or the History day it was opened from. */
function parentPath(mealPath: string): string {
  return mealPath.replace(/\/[^/]*$/, '')
}

/** One meal of a day as a page: what was eaten, and adding to it. */
function MealPage({ page }: { readonly page: MealPageRef }) {
  const { meal, mealPath } = page
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const go = useStackNavigate()
  const { draft } = useAddFoodSession()
  const note = useDay(meal.userId, meal.date).data?.find(
    (candidate) => candidate.meal_type === meal.mealType,
  )?.note
  const person = people.find((candidate) => candidate.id === meal.userId)
  const parent = parentPath(mealPath)
  const today = useToday()
  const mealOfDay = useMealOfDay()
  const waiting = isDraftFor(draft, meal, today, mealOfDay)

  return (
    <>
      <PageHeader
        title={mealLabel(meal.mealType)}
        subtitle={[person && lookOf(person).name, formatShortDay(meal.date)]
          .filter(Boolean)
          .join(' · ')}
        leading={
          <BackButton
            label={parent.startsWith('/history') ? 'History' : 'Today'}
            onClick={() => go(parent)}
          />
        }
      />
      <div className="mb-3">
        <NoteEntryRow
          note={note}
          label={mealLabel(meal.mealType)}
          onOpen={() => go(mealNotePath(mealPath))}
        />
      </div>
      <MealContent
        mealType={meal.mealType}
        userId={meal.userId}
        date={meal.date}
        actions={
          <>
            <Button onClick={() => go(foodPath(mealPath))}>
              {waiting ? 'Continue unsaved dish' : '+ Add food'}
            </Button>
            <Button variant="secondary" onClick={() => go(recipesPath(mealPath))}>
              Add from recipe
            </Button>
            <MealLeftovers meal={meal} />
          </>
        }
      />
    </>
  )
}
