import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { toUserMessage } from '../../lib/errors'
import { GoalRings } from '../goals/GoalRings'
import { GoalSheet } from '../goals/GoalSheet'
import { useGoals } from '../goals/hooks'
import { goalForDate, goalProgress } from '../nutrition/goals'
import type { NutritionTotals } from '../nutrition/types'

type GoalCardProps = {
  readonly userId: string
  /** whose goal it is; only your own goal can be edited */
  readonly isOwnGoal: boolean
  readonly name: string
  readonly date: string
  readonly totals: NutritionTotals
}

const MESSAGE = 'py-2 text-center text-[15px] text-label-secondary'

/** The day's progress against the goal that was valid on that day. */
export function GoalCard({ userId, isOwnGoal, name, date, totals }: GoalCardProps) {
  const goals = useGoals(userId)
  const [editing, setEditing] = useState(false)
  const goal = goalForDate(goals.data ?? [], date)

  function renderContent() {
    if (goals.data === undefined) {
      // a failed load must not look like "no goal", which would invite overwriting it
      if (!goals.isError) return <p className={MESSAGE}>Loading goal…</p>
      return (
        <div className="py-2 text-center">
          <p role="alert" className="text-[15px] text-destructive">
            Couldn’t load the daily goal. {toUserMessage(goals.error)}
          </p>
          <div className="mt-3">
            <Button variant="plain" onClick={() => void goals.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      )
    }
    if (goal) return <GoalRings progress={goalProgress(totals, goal)} />
    if (!isOwnGoal) return <p className={MESSAGE}>{name} hasn’t set a daily goal yet.</p>
    return (
      <div className="py-2 text-center">
        <p className="text-[15px] text-label-secondary">
          Set a daily goal to see your progress here.
        </p>
        <div className="mt-3">
          <Button onClick={() => setEditing(true)}>Set goal</Button>
        </div>
      </div>
    )
  }

  return (
    <section className="mt-4 rounded-xl bg-bg-elevated p-4">
      {renderContent()}
      {isOwnGoal && (
        <GoalSheet
          open={editing}
          userId={userId}
          date={date}
          current={goal}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
