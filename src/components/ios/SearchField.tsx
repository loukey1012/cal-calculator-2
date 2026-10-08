import type { ReactNode } from 'react'
import { SearchIcon } from './icons'

type SearchFieldProps = {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  /** at the end of the bar, e.g. a scan button */
  readonly accessory?: ReactNode
}

/** Search bar. */
export function SearchField({ label, value, onChange, accessory }: SearchFieldProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-bg-elevated px-3 py-2.5 shadow-card">
      <SearchIcon className="h-4 w-4 shrink-0 text-label-secondary" />
      <input
        type="search"
        aria-label={label}
        placeholder="Search"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary"
      />
      {accessory}
    </div>
  )
}
