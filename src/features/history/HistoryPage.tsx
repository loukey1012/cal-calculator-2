import { EmptyState } from '../../components/ios/EmptyState'
import { PageHeader } from '../../components/ios/PageHeader'

export function HistoryPage() {
  return (
    <>
      <PageHeader title="History" />
      <EmptyState
        title="No history yet"
        message="Your past days and meals will appear here, ready to look back on and edit."
      />
    </>
  )
}
