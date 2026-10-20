import { useEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

// the fields it steps through: number fields (their keyboard has no return key)
const VALUE_FIELDS = 'input[inputmode="decimal"]:not([disabled])'
// its height plus a little air above the keyboard
const OFFSET_PX = 52

type Place = { readonly top: number }

/** Where the keyboard begins: the bottom of the visible part of the page. */
function placeAboveKeyboard(): Place {
  const viewport = window.visualViewport
  const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight
  return { top: bottom - OFFSET_PX }
}

function valueFields(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>(VALUE_FIELDS)]
}

type KeyboardNextButtonProps = {
  /** the form whose value fields it steps through */
  readonly container: RefObject<HTMLElement | null>
}

/**
 * The iPhone's number pad has no return key: while one of the container's value fields is
 * focused, a Next button sits on top of the keyboard (never on the page) and moves to the next
 * value field with the keyboard staying open; on the last one it says Done and closes it.
 */
export function KeyboardNextButton({ container }: KeyboardNextButtonProps) {
  const [field, setField] = useState<HTMLInputElement | null>(null)
  const [place, setPlace] = useState<Place>(placeAboveKeyboard)

  useEffect(() => {
    const root = container.current
    if (!root) return
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      setField(target instanceof HTMLInputElement && target.matches(VALUE_FIELDS) ? target : null)
      setPlace(placeAboveKeyboard())
    }
    const onFocusOut = (event: FocusEvent) => {
      // moving to the next value field keeps it; anything else hides it
      const next = event.relatedTarget
      if (!(next instanceof HTMLInputElement) || !root.contains(next)) setField(null)
    }
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    return () => {
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
    }
  }, [container])

  // the keyboard opening, closing or the page scrolling moves its top
  useEffect(() => {
    const viewport = window.visualViewport
    if (!field || !viewport) return
    const follow = () => setPlace(placeAboveKeyboard())
    viewport.addEventListener('resize', follow)
    viewport.addEventListener('scroll', follow)
    return () => {
      viewport.removeEventListener('resize', follow)
      viewport.removeEventListener('scroll', follow)
    }
  }, [field])

  const root = container.current
  if (!field || !root) return null
  const fields = valueFields(root)
  const next = fields[fields.indexOf(field) + 1]

  return createPortal(
    <button
      type="button"
      // keeps the field focused (and the keyboard open) until the tap is done
      onPointerDown={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (next) next.focus()
        else {
          field.blur()
          setField(null)
        }
      }}
      style={{ top: place.top }}
      className="fixed right-3 z-50 rounded-full bg-accent px-4 py-2.5 text-[16px] font-bold text-on-accent shadow-card active:opacity-70"
    >
      {next ? 'Next' : 'Done'}
    </button>,
    document.body,
  )
}
