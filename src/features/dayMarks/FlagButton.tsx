import type { ReactNode, Ref } from 'react'

type FlagColor = 'cheat' | 'alcohol' | 'gym' | 'heart'

type FlagButtonProps = {
  /** the accessible name; it carries the state when the button isn't a toggle */
  readonly label: string
  /** an svg, coloured by currentColor */
  readonly symbol: ReactNode
  readonly color: FlagColor
  readonly on: boolean
  readonly disabled?: boolean
  readonly onPress: () => void
  /** the button opens a popover instead of toggling */
  readonly hasPopup?: boolean
  /** whether that popover is open (only said with hasPopup) */
  readonly expanded?: boolean
  /** the popover anchors to the button */
  readonly ref?: Ref<HTMLButtonElement>
}

// full class strings, as Tailwind finds classes by scanning the source
const OFF_CLASSES: Record<FlagColor, string> = {
  cheat: 'border-separator text-cheat',
  alcohol: 'border-separator text-alcohol',
  gym: 'border-separator text-gym',
  heart: 'border-separator text-heart',
}
const ON_CLASSES: Record<FlagColor, string> = {
  cheat: 'border-cheat bg-cheat text-on-mark',
  alcohol: 'border-alcohol bg-alcohol text-on-mark',
  gym: 'border-gym bg-gym text-on-mark',
  heart: 'border-heart bg-heart text-on-mark',
}

/**
 * A round, icon-only button for a flag of the day: a hairline outline with the symbol in the
 * flag's colour when off, filled with it when on. It is 30 px wide; an invisible pseudo-element
 * stretches the tap area to 44 pt high and as wide as the 8 px gap to its neighbours allows.
 */
export function FlagButton({
  label,
  symbol,
  color,
  on,
  disabled = false,
  onPress,
  hasPopup = false,
  expanded,
  ref,
}: FlagButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      // a disclosure button says its state in its name and expanded, not as a toggle
      aria-pressed={hasPopup ? undefined : on}
      aria-label={label}
      aria-haspopup={hasPopup ? 'dialog' : undefined}
      aria-expanded={hasPopup ? (expanded ?? false) : undefined}
      disabled={disabled}
      onClick={onPress}
      className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border before:absolute before:-inset-x-1 before:-inset-y-[7px] before:content-[''] active:opacity-70 disabled:opacity-40 ${on ? ON_CLASSES[color] : OFF_CLASSES[color]}`}
    >
      <span
        aria-hidden="true"
        className="flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
      >
        {symbol}
      </span>
    </button>
  )
}
