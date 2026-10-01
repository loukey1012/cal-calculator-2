import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

export function TodayPage() {
  const [today] = useState(() => new Date())
  const dateLabel = new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(today)

  return (
    <>
      <PageHeader title="Today" subtitle={dateLabel} />
      <GroupedSection header="Meals" footer="Logging meals is coming soon.">
        {MEALS.map((meal) => (
          <ListRow key={meal} title={meal} detail="–" />
        ))}
      </GroupedSection>
    </>
  )
}
