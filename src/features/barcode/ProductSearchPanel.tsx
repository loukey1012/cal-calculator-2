import { useRef, useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { SearchField } from '../../components/ios/SearchField'
import { searchProducts, type ProductHit, type ProductSearch } from './openFoodFacts'

const MESSAGES = {
  busy: 'Open Food Facts allows only a few searches a minute. Try again in a minute.',
  unavailable: 'Couldn’t search right now. Check the connection and try again.',
  empty: 'Nothing found. Try fewer or other words.',
} as const

type SearchState = { readonly kind: 'idle' } | { readonly kind: 'loading' } | ProductSearch

type ProductSearchPanelProps = {
  /** e.g. the name typed into the form */
  readonly initialQuery: string
  readonly onPick: (hit: ProductHit) => void
}

function hitSubtitle(hit: ProductHit): string {
  const kcal = hit.values.per100gEnabled
    ? `${hit.values.per100g.kcal} kcal / 100 g`
    : `${hit.values.perUnit.kcal} kcal / portion`
  return [hit.values.brand, kcal].filter(Boolean).join(' · ')
}

function Thumbnail({ url }: { readonly url: string | null }) {
  if (!url) return <span className="h-10 w-10 shrink-0 rounded-lg bg-fill" />
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-10 w-10 shrink-0 rounded-lg bg-fill object-cover"
    />
  )
}

/** Finds a similar product on Open Food Facts by name, for food without values on it. */
export function ProductSearchPanel({ initialQuery, onPick }: ProductSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery)
  const [state, setState] = useState<SearchState>({ kind: 'idle' })
  // only the latest search may show its results
  const latest = useRef(0)

  async function search() {
    if (query.trim() === '') return
    const request = latest.current + 1
    latest.current = request
    setState({ kind: 'loading' })
    const result = await searchProducts(query)
    if (latest.current === request) setState(result)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchField
            label="Search Open Food Facts"
            placeholder="Product name"
            value={query}
            onChange={setQuery}
            onSubmit={() => void search()}
          />
        </div>
        <Button
          variant="plain"
          disabled={query.trim() === ''}
          loading={state.kind === 'loading'}
          onClick={() => void search()}
        >
          Search
        </Button>
      </div>
      {state.kind === 'loading' && (
        <p role="status" className="mt-3 px-4 text-[15px] text-label-secondary">
          Searching…
        </p>
      )}
      {(state.kind === 'busy' || state.kind === 'unavailable') && (
        <p role="status" className="mt-3 px-4 text-[15px] text-label-secondary">
          {MESSAGES[state.kind]}
        </p>
      )}
      {state.kind === 'found' &&
        (state.hits.length === 0 ? (
          <p role="status" className="mt-3 px-4 text-[15px] text-label-secondary">
            {MESSAGES.empty}
          </p>
        ) : (
          <GroupedSection footer="Values of a similar product: check they fit what you have.">
            {state.hits.map((hit) => (
              <ListRow
                key={hit.barcode}
                leading={<Thumbnail url={hit.info.imageUrl} />}
                title={hit.values.name}
                subtitle={hitSubtitle(hit)}
                onClick={() => onPick(hit)}
              />
            ))}
          </GroupedSection>
        ))}
    </div>
  )
}
