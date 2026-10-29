import type { DayStatus } from './calendar'
import { ForkKnifeSymbol, WineGlassSymbol } from './calendarSymbols'

/** The statuses that get a mark: one status, one mark (`dayStatus` has already picked it). */
type MarkedStatus = Extract<DayStatus, 'alcoholDay' | 'cheatDay' | 'missing' | 'cheatMeal'>

const isMarked = (status: DayStatus): status is MarkedStatus =>
  status === 'alcoholDay' || status === 'cheatDay' || status === 'missing' || status === 'cheatMeal'

// whole class names, so Tailwind finds them
const BADGE_BACKGROUND: Record<Exclude<MarkedStatus, 'cheatMeal'>, string> = {
  alcoholDay: 'bg-alcohol',
  cheatDay: 'bg-cheat',
  missing: 'bg-missing',
}
const TEST_ID: Record<MarkedStatus, string> = {
  alcoholDay: 'alcohol-mark',
  cheatDay: 'cheat-day-mark',
  missing: 'missing-dot',
  cheatMeal: 'cheat-meal-mark',
}

type MarkSize = 'cell' | 'key'
// whole class names: badge, glyph inside it, and the outlined fork and knife
const SIZE: Record<MarkSize, { badge: string; glyph: string; outline: string }> = {
  cell: { badge: 'h-3 w-3', glyph: 'h-2 w-2', outline: 'h-[11px] w-[11px]' },
  key: { badge: 'h-4 w-4', glyph: 'h-2.5 w-2.5', outline: 'h-3.5 w-3.5' },
}

type LeftOutMarkProps = {
  readonly status: DayStatus
  /** on the open day, which is filled with the accent color */
  readonly selected?: boolean
  /** `cell` in the calendar, `key` a little larger for the key */
  readonly size?: MarkSize
  /** where it sits (absolute offsets) or how it flows */
  readonly className?: string
}

/**
 * The one mark that says why a day does not count. A whole day that is out (alcohol, cheat day,
 * missing meals) gets a filled badge with a white glyph; a cheat meal an outlined fork and
 * knife. On the open day the badge turns white with an accent glyph, the outline on-accent.
 */
export function LeftOutMark({
  status,
  selected = false,
  size = 'cell',
  className = '',
}: LeftOutMarkProps) {
  if (!isMarked(status)) return null
  const { badge, glyph, outline } = SIZE[size]
  if (status === 'cheatMeal') {
    return (
      <ForkKnifeSymbol
        data-testid={TEST_ID[status]}
        className={`${outline} shrink-0 ${selected ? 'text-on-accent' : 'text-cheat'} ${className}`}
      />
    )
  }
  const look = selected ? 'bg-on-accent text-accent' : `${BADGE_BACKGROUND[status]} text-on-missing`
  return (
    <span
      aria-hidden="true"
      data-testid={TEST_ID[status]}
      className={`flex ${badge} shrink-0 items-center justify-center rounded-full ${look} ${className}`}
    >
      {status === 'alcoholDay' && <WineGlassSymbol className={glyph} strokeWidth="1.8" />}
      {status === 'cheatDay' && <ForkKnifeSymbol className={glyph} strokeWidth="1.8" />}
      {status === 'missing' && <span className="text-[9px] leading-none font-extrabold">!</span>}
    </span>
  )
}
