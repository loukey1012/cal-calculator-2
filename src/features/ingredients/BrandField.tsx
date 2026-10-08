import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { brandSuggestions } from './brands'
import type { Ingredient } from './ingredientsApi'

type BrandFieldProps = {
  readonly value: string
  readonly onChange: (brand: string) => void
  readonly error?: string
  /** whose brands are suggested */
  readonly savedIngredients: readonly Ingredient[]
}

/** The brand, with the household's saved brands suggested while typing (free text still works). */
export function BrandField({ value, onChange, error, savedIngredients }: BrandFieldProps) {
  const id = useId()
  const listId = `${id}-brands`
  const errorId = `${id}-error`
  // opens on typing only, so a brand filled in by a scan doesn't pop the list up
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const suggestions = open ? brandSuggestions(savedIngredients, value) : []
  const expanded = suggestions.length > 0
  const list = useRef<HTMLUListElement>(null)

  // the list opens below the field: keep it clear of the iPhone keyboard
  useEffect(() => {
    if (expanded) list.current?.scrollIntoView?.({ block: 'nearest' })
  }, [expanded])

  function choose(brand: string) {
    onChange(brand)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!expanded) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && active >= 0) {
      // picks the brand instead of sending the form
      event.preventDefault()
      choose(suggestions[active] ?? value)
    } else if (event.key === 'Escape') {
      // closes the list, not the sheet around the form
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="px-4 py-3">
      <label htmlFor={id} className="sr-only">
        Brand
      </label>
      <input
        id={id}
        role="combobox"
        placeholder="Brand"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        className="w-full bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary"
      />
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label="Saved brands"
        hidden={!expanded}
        className="mt-2 overflow-hidden rounded-2xl bg-fill/60"
      >
        {suggestions.map((brand, index) => (
          <li
            key={brand}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            // keeps the focus in the field, so the tap lands before the list closes
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(brand)}
            className={`cursor-pointer px-3 py-2.5 text-[16px] font-medium active:bg-fill ${
              index === active ? 'bg-fill' : ''
            }`}
          >
            {brand}
          </li>
        ))}
      </ul>
      {error && (
        <p id={errorId} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
