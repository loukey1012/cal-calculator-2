import { useId, type ReactNode } from 'react'
import { formatKcal } from '../../nutrition/format'
import { mealLabel, type MealType } from '../../meals/dayModel'
import { formatSpan } from '../../trends/trendFormat'
import type { MonthNote } from '../monthStats'
import { NoteRow } from '../NoteRow'
import { plural } from './weekFormat'
import type { WeekDay } from './weekStats'

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-4">
      <h2 id={headingId} className="caption px-4 pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

const CARD = 'glass-surface overflow-hidden rounded-3xl bg-bg-elevated shadow-card'

type ExtremesProps = {
  readonly highest: WeekDay
  readonly lowest: WeekDay
  readonly onOpenDay: (date: string) => void
}

/** The day with the most and the day with the fewest calories, among the counted days. */
export function ExtremeDays({ highest, lowest, onOpenDay }: ExtremesProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {[
        { label: 'Highest day', day: highest },
        { label: 'Lowest day', day: lowest },
      ].map(({ label, day }) => (
        <button
          key={label}
          type="button"
          aria-label={`${label}, ${formatSpan(day.date, day.date)}, ${formatKcal(day.kcal)} kcal`}
          onClick={() => onOpenDay(day.date)}
          className={`${CARD} p-4 text-left active:bg-fill`}
        >
          <span className="caption block">{label}</span>
          <span className="mt-1 block text-[15px] font-semibold">
            {formatSpan(day.date, day.date)}
          </span>
          <span className="block text-[17px] font-bold tabular-nums">
            {`${formatKcal(day.kcal)} kcal`}
          </span>
        </button>
      ))}
    </div>
  )
}

type MealAveragesProps = {
  readonly meals: ReadonlyArray<{ readonly mealType: MealType; readonly average: number }>
}

export function MealAverages({ meals }: MealAveragesProps) {
  return (
    <Section title="Average per meal">
      <ul className={`${CARD} divide-y divide-separator`}>
        {meals.map(({ mealType, average }) => (
          <li key={mealType} className="flex items-center justify-between px-4 py-3 text-[15px]">
            <span className="font-semibold">{mealLabel(mealType)}</span>
            <span className="text-label-secondary tabular-nums">{`${formatKcal(average)} kcal`}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function MostEaten({
  foods,
}: {
  readonly foods: ReadonlyArray<{ readonly name: string; readonly days: number }>
}) {
  return (
    <Section title="Most eaten">
      <ul className={`${CARD} divide-y divide-separator`}>
        {foods.map((food) => (
          <li key={food.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate text-[15px] font-semibold">{food.name}</span>
            <span className="shrink-0 text-[14px] text-label-secondary">
              {plural(food.days, 'time', 'times')}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

type WeekNotesProps = {
  readonly notes: readonly MonthNote[]
  readonly onOpenDay: (date: string) => void
}

export function WeekNotes({ notes, onOpenDay }: WeekNotesProps) {
  return (
    <Section title="Notes">
      <ul className={`${CARD} divide-y divide-separator`}>
        {notes.map((note) => (
          <NoteRow
            key={`${note.date}-${note.mealType ?? 'day'}`}
            note={note}
            onOpenDay={onOpenDay}
          />
        ))}
      </ul>
    </Section>
  )
}
