import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { toUserMessage } from '../../lib/errors'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import { displayName, usePeople } from '../household/hooks'
import { useToday } from '../today/useToday'
import { addDays } from '../trends/trends'
import { toCsv } from './csv'
import { fetchExportData } from './exportApi'
import { DAY_HEADER, dayRows, FOOD_HEADER, foodRows } from './exportRows'
import { shareOrDownload, type ShareOutcome } from './shareFiles'

export const EXPORT_PATH = '/settings/export'

// the range a new export starts with: the last 30 days, today included
const DEFAULT_DAYS = 30
const CSV_TYPE = 'text/csv;charset=utf-8'

const OUTCOME_MESSAGES: Record<ShareOutcome, string | null> = {
  shared: null,
  cancelled: null,
  downloaded: '2 files downloaded.',
}

/** Settings › Export: both members' foods and days of a date range, as CSV files. */
export function ExportPage() {
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const today = useToday()
  const [from, setFrom] = useState(() => addDays(today, 1 - DEFAULT_DAYS))
  const [to, setTo] = useState(today)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const validRange = from !== '' && to !== '' && from <= to

  async function handleExport() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const data = await fetchExportData(
        people.map((person) => ({ id: person.id, name: displayName(person) })),
        from,
        to,
      )
      const range = `${from}-to-${to}`
      const files = [
        new File([toCsv(FOOD_HEADER, foodRows(data))], `calculator-foods-${range}.csv`, {
          type: CSV_TYPE,
        }),
        new File([toCsv(DAY_HEADER, dayRows(data))], `calculator-days-${range}.csv`, {
          type: CSV_TYPE,
        }),
      ]
      setMessage(OUTCOME_MESSAGES[await shareOrDownload(files, 'CALculator export')])
    } catch (caught) {
      setError(toUserMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppearanceSubPage
      title="Export"
      back={{ path: '/settings', label: 'Settings' }}
      saveError={null}
    >
      <p className="text-[14px] font-medium text-label-secondary">
        Both of you: every logged food and each day’s totals with weight, as two CSV files.
      </p>
      <GroupedSection>
        <InputRow
          label="From"
          type="date"
          max={today}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
        />
        <InputRow
          label="To"
          type="date"
          max={today}
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
        />
      </GroupedSection>
      {!validRange && (
        <p className="mt-2 px-4 text-[13px] text-destructive">“From” must be on or before “To”.</p>
      )}
      {error && <ErrorBanner message={error} />}
      <div className="mt-6">
        <Button loading={busy} disabled={!validRange} onClick={() => void handleExport()}>
          Export
        </Button>
      </div>
      {message && <p className="mt-3 text-center text-[15px] text-label-secondary">{message}</p>}
    </AppearanceSubPage>
  )
}
