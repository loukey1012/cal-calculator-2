import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { packChipOrder } from './chipRows'

/** Attribute each chip carries so its width can be measured. */
export const CHIP_KEY_ATTRIBUTE = 'data-chip-key'

/** `items` sorted into `order` (by the key `keyOf` gives each); unknown keys go last. */
export function arrange<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  order: readonly string[],
): readonly T[] {
  const position = new Map(order.map((key, index) => [key, index]))
  const rank = (item: T) => position.get(keyOf(item)) ?? order.length
  return [...items].sort((a, b) => rank(a) - rank(b))
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((key, index) => key === b[index])

/**
 * The order in which wrapping chips fill the fewest rows. Measures the chips inside `ref` (each
 * with a `data-chip-key`) before the browser paints, and again when the row width or the fonts
 * change. Until measured, or when `enabled` is false, the chips keep their given order.
 */
export function usePackedOrder<T extends HTMLElement>(
  keys: readonly string[],
  enabled = true,
): { readonly ref: RefObject<T | null>; readonly order: readonly string[] } {
  const ref = useRef<T>(null)
  const [packed, setPacked] = useState<readonly string[] | null>(null)
  const keyList = keys.join('\n')

  const measure = useCallback(() => {
    const container = ref.current
    if (!container || !enabled) return
    const widths = new Map(
      [...container.querySelectorAll<HTMLElement>(`[${CHIP_KEY_ATTRIBUTE}]`)].map((chip) => [
        chip.getAttribute(CHIP_KEY_ATTRIBUTE) ?? '',
        chip.offsetWidth,
      ]),
    )
    const chips = keyList.split('\n').map((key) => ({ key, width: widths.get(key) ?? 0 }))
    // no layout yet (or none at all, as in tests): keep the given order
    const measured = container.clientWidth > 0 && chips.every((chip) => chip.width > 0)
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0
    const next = measured ? packChipOrder(chips, container.clientWidth, gap) : null
    setPacked((current) => (current && next && sameOrder(current, next) ? current : next))
  }, [enabled, keyList])

  useLayoutEffect(() => {
    measure()
    const container = ref.current
    if (!container || !enabled) return
    let active = true
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    // web fonts can arrive after the first measurement and change every chip's width
    void document.fonts?.ready.then(() => {
      if (active) measure()
    })
    return () => {
      active = false
      observer.disconnect()
    }
  }, [enabled, measure])

  const current = packed && sameOrder([...packed].sort(), [...keys].sort()) ? packed : keys
  return { ref, order: enabled ? current : keys }
}
