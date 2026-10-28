import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../../app/currentUser'
import { personOf, useStackNavigate } from '../../../app/stackNavigate'
import { BackButton } from '../../../components/ios/BackButton'
import { EmptyState } from '../../../components/ios/EmptyState'
import { ErrorBanner } from '../../../components/ios/ErrorBanner'
import { PageHeader } from '../../../components/ios/PageHeader'
import { toUserMessage } from '../../../lib/errors'
import { useGoals } from '../../goals/hooks'
import { usePeople } from '../../household/hooks'
import { useLookOf } from '../../household/usePersonLook'
import { useToday } from '../../today/useToday'
import { AveragesCard } from './AveragesCard'
import { SavedCard } from './SavedCard'
import { useTotalsSinceStart, useWeekData } from './hooks'
import { weekOriginOf } from '../historyState'
import { historyStateOfDay } from './historyStateOfDay'
import { WeekArrows } from './WeekArrows'
import { weekFigures } from './weekFigures'
import { formatWeekRange } from './weekFormat'
import { ExtremeDays, MealAverages, MostEaten, WeekNotes } from './WeekHighlights'
import { isoWeekOf, shiftWeek, weekDatesOf, weekPath, type IsoWeek } from './weekPages'
import { savedKcal } from './weekStats'
import { WeekStrip } from './WeekStrip'

/** One calendar week as a page over History: what it saved, how it went, what was eaten. */
export function WeekRoute({ week }: { readonly week: IsoWeek }) {
  const { profile, householdId } = useCurrentUser()
  const location = useLocation()
  const navigate = useNavigate()
  const go = useStackNavigate()
  const lookOf = useLookOf()
  const today = useToday()
  const people = usePeople(profile, householdId)
  const person = people.find((member) => member.id === personOf(location.state)) ?? profile
  const dates = weekDatesOf(week)
  const [first = '', last = ''] = [dates[0], dates.at(-1)]
  const data = useWeekData(person.id, first, last)
  const goals = useGoals(person.id)
  const sinceStart = useTotalsSinceStart(person.id, today)

  // a day opens in the History calendar, as a tapped note does there
  function openDay(day: string) {
    navigate(`/history/${day}`, {
      replace: true,
      state: historyStateOfDay(day, person.id, location.state),
    })
  }

  const range = formatWeekRange(first, last)
  const isRunning = dates.includes(today)
  return (
    <>
      <PageHeader
        title={isRunning ? 'This week' : `Week ${week.week}`}
        leading={
          <BackButton
            label="History"
            onClick={() => go(weekOriginOf(location.state) ?? '/history')}
          />
        }
        action={
          <WeekArrows
            onPrevious={() => go(weekPath(shiftWeek(week, -1)))}
            onNext={() => go(weekPath(shiftWeek(week, 1)))}
            nextDisabled={isRunning || first > today}
          />
        }
      />
      <p className="caption -mt-1">
        {person.id === profile.id ? range : `${lookOf(person).name} · ${range}`}
      </p>
      {data.data === undefined ? (
        data.isError ? (
          <ErrorBanner message={toUserMessage(data.error)} />
        ) : (
          <LoadingNote />
        )
      ) : goals.data === undefined && !goals.isError ? (
        <LoadingNote />
      ) : (
        <>
          {goals.data === undefined && <ErrorBanner message={toUserMessage(goals.error)} />}
          {data.isPlaceholder && <LoadingNote />}
          {/* the week just left stays, dimmed, until the one asked for is there */}
          <div
            aria-busy={data.isPlaceholder || undefined}
            className={data.isPlaceholder ? 'pointer-events-none opacity-50' : undefined}
          >
            <WeekBody
              data={data.data}
              goals={goals.data}
              dates={weekDatesOf(isoWeekOf(data.shown.first))}
              today={today}
              person={{ name: lookOf(person).name, isOwn: person.id === profile.id }}
              sinceStart={{
                totals: sinceStart.data,
                error: sinceStart.isError ? toUserMessage(sinceStart.error) : null,
              }}
              onOpenDay={openDay}
            />
          </div>
        </>
      )}
    </>
  )
}

function LoadingNote() {
  return (
    <p role="status" className="mt-6 text-center text-[15px] text-label-secondary">
      Loading…
    </p>
  )
}

type WeekBodyProps = {
  readonly data: NonNullable<ReturnType<typeof useWeekData>['data']>
  /** undefined when they could not be read: the parts that depend on them are left out */
  readonly goals: ReturnType<typeof useGoals>['data']
  readonly dates: readonly string[]
  readonly today: string
  readonly person: { readonly name: string; readonly isOwn: boolean }
  readonly sinceStart: {
    readonly totals: NonNullable<ReturnType<typeof useTotalsSinceStart>['data']> | undefined
    readonly error: string | null
  }
  readonly onOpenDay: (date: string) => void
}

function WeekBody({
  data,
  goals: knownGoals,
  dates,
  today,
  person,
  sinceStart,
  onOpenDay,
}: WeekBodyProps) {
  const goals = knownGoals ?? []
  const figures = weekFigures(data, goals, today, dates)
  if (!figures.hasFood && data.notes.length === 0) {
    return (
      <EmptyState
        title="Nothing logged this week"
        message={figures.isRunning ? 'Meals you log will show up here.' : 'No meals were logged.'}
      />
    )
  }
  const total =
    sinceStart.totals === undefined ? undefined : savedKcal(sinceStart.totals, goals, today)
  return (
    <>
      {knownGoals && (
        <SavedCard
          saved={figures.saved}
          hasBurned={goals.some((goal) => goal.kcalBurned !== null)}
          personName={person.name}
          isOwn={person.isOwn}
          isRunning={figures.isRunning}
          total={total}
          totalError={sinceStart.error}
          budget={figures.budget}
        />
      )}
      <WeekStrip
        dates={dates}
        byDate={figures.byDate}
        goals={goals}
        today={today}
        counting={figures.counting}
        onOpenDay={onOpenDay}
      />
      {figures.averages && <AveragesCard averages={figures.averages} within={figures.within} />}
      {figures.extremes && <ExtremeDays {...figures.extremes} onOpenDay={onOpenDay} />}
      {figures.meals.length > 0 && <MealAverages meals={figures.meals} />}
      {figures.foods.length > 0 && <MostEaten foods={figures.foods} />}
      {data.notes.length > 0 && <WeekNotes notes={data.notes} onOpenDay={onOpenDay} />}
    </>
  )
}
