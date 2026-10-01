import { EmptyState } from '../../components/ios/EmptyState'
import { PageHeader } from '../../components/ios/PageHeader'

export function IngredientsPage() {
  return (
    <>
      <PageHeader title="Ingredients" />
      <EmptyState
        title="No ingredients yet"
        message="Your household’s ingredient database will appear here."
      />
    </>
  )
}
