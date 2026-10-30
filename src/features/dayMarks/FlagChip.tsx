import type { ReactNode, Ref } from 'react'

type FlagColor = 'cheat' | 'alcohol' | 'gym' | 'heart'

type FlagChipProps = {
  readonly label: string
  /** an svg, coloured by currentColor */
  readonly symbol: ReactNode
  readonly color: FlagColor
  readonly on: boolean
  readonly disabled?: boolean
  readonly onPress: () => void
  /** replaces the visible label as the accessible name (it must start with the label) */
  readonly accessibleName?: string
  /** the chip opens a popover */
  readonly hasPopup?: boolean
  /** whether that popover is open (only said with hasPopup) */
  readonly expanded?: boolean
  /** the popover anchors to the button */
  readonly ref?: Ref<HTMLButtonElement>
}

// full class strings, as Tailwind finds classes by scanning the source
const ON_CLASSES: Record<FlagColor, string> = {
  cheat: 'border-cheat bg-cheat text-on-mark',
  alcohol: 'border-alcohol bg-alcohol text-on-mark',
  gym: 'border-gym bg-gym text-on-mark',
  heart: 'border-heart bg-heart text-on-mark',
}
const SYMBOL_CLASSES: Record<FlagColor, string> = {
  cheat: 'text-cheat',
  alcohol: 'text-alcohol',
  gym: 'text-gym',
  heart: 'text-heart',
}
const OFF_CLASSES = 'border-separator text-label-secondary'

/**
 * A toggle chip for a flag of the day. Off is a grey outline, on is filled with the flag's
 * colour. It is about 30 px high; a pseudo-element stretches the tap area to 44 pt.
 */
export function FlagChip({
  label,
  symbol,
  color,
  on,
  disabled = false,
  onPress,
  accessibleName,
  hasPopup = false,
  expanded,
  ref,
}: FlagChipProps) {
  return (
    <button
      ref={ref}
      type="button"
      // a disclosure button says its state in its name and expanded, not as a toggle
      aria-pressed={hasPopup ? undefined : on}
      aria-label={accessibleName}
      aria-haspopup={hasPopup ? 'dialog' : undefined}
      aria-expanded={hasPopup ? (expanded ?? false) : undefined}
      disabled={disabled}
      onClick={onPress}
      className={`relative inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-[''] active:opacity-70 disabled:opacity-40 ${on ? ON_CLASSES[color] : OFF_CLASSES}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-3.5 w-3.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full ${on ? '' : SYMBOL_CLASSES[color]}`}
      >
        {symbol}
      </span>
      {label}
    </button>
  )
}
