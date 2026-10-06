import { Avatar } from '../../components/ios/Avatar'
import type { PartnerSymbol, PersonLook } from './partnerLook'

type Size = 'small' | 'large'

const SIZE_CLASSES: Record<Size, string> = { small: 'h-8 w-8', large: 'h-10 w-10' }
const SYMBOL_CLASSES: Record<Size, string> = { small: 'text-[17px]', large: 'text-[21px]' }
const HEART_CLASSES: Record<Size, string> = {
  small: 'h-[18px] w-[18px]',
  large: 'h-[22px] w-[22px]',
}
// about 20% of the color, so the circle stays soft on light and dark cards alike
const TINT_ALPHA = '33'

/** A filled heart in the given color. */
export function HeartGlyph({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={color}>
      <path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.2 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.3h2c.7-1.2 2.2-2.3 4.3-2.3 3.7 0 5.8 3.7 4.3 7.1C19.5 16.4 12 21 12 21Z" />
    </svg>
  )
}

type SymbolBadgeProps = {
  readonly symbol: PartnerSymbol
  readonly color: string
  readonly size?: Size
}

/** The symbol you picked for someone, on a circle tinted with their color. Decorative. */
export function SymbolBadge({ symbol, color, size = 'small' }: SymbolBadgeProps) {
  return (
    <span
      aria-hidden="true"
      data-testid="partner-badge"
      className={`grid shrink-0 place-items-center rounded-full leading-none ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: `${color}${TINT_ALPHA}` }}
    >
      {symbol === 'heart' ? (
        <HeartGlyph color={color} className={HEART_CLASSES[size]} />
      ) : (
        <span className={SYMBOL_CLASSES[size]}>{symbol}</span>
      )}
    </span>
  )
}

type PersonBadgeProps = { readonly look: PersonLook; readonly size?: Size }

/** Your own initial, or the symbol you picked for your partner. */
export function PersonBadge({ look, size = 'small' }: PersonBadgeProps) {
  const { badge } = look
  if (badge.kind === 'initial') return <Avatar name={look.name} color={badge.color} size={size} />
  return <SymbolBadge symbol={badge.symbol} color={badge.color} size={size} />
}
