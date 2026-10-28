import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../lib/errors'
import { renderWithProviders } from '../../test/render'

vi.mock('./historyApi', () => ({ fetchAllNotes: vi.fn() }))

import { fetchAllNotes } from './historyApi'
import { HistoryNotesView } from './HistoryNotesView'

const NOTES = [
  { date: '2026-10-12', mealType: null, text: 'Birthday at Oma’s' },
  { date: '2026-10-12', mealType: 'dinner', text: 'Käse pizza' },
  { date: '2026-09-30', mealType: 'lunch', text: 'Salad' },
] as const

/** The page keeps the search text; this stands in for it. */
function WithQuery({ onOpenDay }: { readonly onOpenDay: () => void }) {
  const [query, setQuery] = useState('')
  return (
    <HistoryNotesView userId="u1" query={query} onChangeQuery={setQuery} onOpenDay={onOpenDay} />
  )
}

function renderView(onOpenDay = vi.fn()) {
  renderWithProviders(<WithQuery onOpenDay={onOpenDay} />)
  return { onOpenDay }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchAllNotes).mockResolvedValue([...NOTES])
})

describe('HistoryNotesView', () => {
  test('lists the notes of all months under a heading per month, newest first', async () => {
    renderView()

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    const october = screen.getByRole('region', { name: 'October 2026' })
    expect(within(october).getByText('Birthday at Oma’s')).toBeInTheDocument()
    expect(within(october).getByText('Dinner · Käse pizza')).toBeInTheDocument()
    expect(within(october).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(screen.getByRole('region', { name: 'September 2026' })).getByText('Lunch · Salad'),
    ).toBeInTheDocument()
    expect(fetchAllNotes).toHaveBeenCalledWith('u1')
  })

  test('a tap on a note opens its day', async () => {
    const user = userEvent.setup()
    const { onOpenDay } = renderView()

    await user.click(await screen.findByRole('button', { name: /Salad/ }))

    expect(onOpenDay).toHaveBeenCalledWith('2026-09-30')
  })

  test('search finds notes without regard to case or accents', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Lunch · Salad')

    await user.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'KASE')

    expect(screen.getByText('Dinner · Käse pizza')).toBeInTheDocument()
    expect(screen.queryByText('Lunch · Salad')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'September 2026' })).not.toBeInTheDocument()
  })

  test('says so when no note matches the search', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Lunch · Salad')

    await user.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'sushi')

    expect(screen.getByText('No notes match “sushi”.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('says so when there are no notes yet, and offers no search', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([])
    renderView()

    expect(await screen.findByText('No notes yet.')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  test('shows that the notes are loading', () => {
    vi.mocked(fetchAllNotes).mockReturnValue(new Promise(() => {}))
    renderView()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  test('shows an error instead of an empty list when loading fails', async () => {
    vi.mocked(fetchAllNotes).mockRejectedValue(new ApiError('boom', 'unknown'))
    renderView()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('No notes yet.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
  })
})
