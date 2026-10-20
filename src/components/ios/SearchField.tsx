import { useRef, type ReactNode } from 'react'
import { ClearIcon, SearchIcon } from './icons'

type SearchFieldProps = {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  /** at the end of the bar, e.g. a scan button */
  readonly accessory?: ReactNode
  /** the keyboard's search key; also keeps it from submitting a form around the field */
  readonly onSubmit?: () => void
  readonly placeholder?: string
}

/** Search bar. */
export function SearchField({
  label,
  value,
  onChange,
  accessory,
  onSubmit,
  placeholder = 'Search',
}: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="glass-surface flex items-center gap-2 rounded-2xl bg-bg-elevated px-3 py-2.5 shadow-card">
      <SearchIcon className="h-4 w-4 shrink-0 text-label-secondary" />
      <input
        ref={input}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !onSubmit) return
          event.preventDefault()
          // closes the keyboard, so the results can be seen
          event.currentTarget.blur()
          onSubmit()
        }}
        // our own clear button below, never the browser's
        className="w-full bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            // keep typing right away
            input.current?.focus()
          }}
          className="-m-1 shrink-0 p-1 text-label-secondary active:opacity-60"
        >
          <ClearIcon className="h-[18px] w-[18px]" />
        </button>
      )}
      {accessory}
    </div>
  )
}
