import { useState, type ReactNode } from 'react'
import {
  DumbbellSymbol,
  ForkKnifeSymbol,
  HeartSymbol,
  WineGlassSymbol,
} from '../history/calendarSymbols'
import { MEAL_TYPES } from '../meals/dayModel'
import { CheatMealPopover } from './CheatMealPopover'
import { FlagChip } from './FlagChip'
import type { DayFlags } from './useDayFlags'

type DayFlagChipsProps = {
  readonly flags: DayFlags
  /** e.g. "Lunch missing"; null when no main meal is missing */
  readonly missingLabel: string | null
  /** shown first in the row, e.g. the leftovers offer */
  readonly leading?: ReactNode
}

/** A grey label for what the day lacks: not a button, with the calendar's orange "!" beside it. */
function MissingBadge({ label }: { readonly label: string }) {
  return (
    <span className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 text-[13px] font-bold whitespace-nowrap text-label-secondary">
      <span
        aria-hidden="true"
        data-testid="missing-dot"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-missing text-on-missing"
      >
        <span className="text-[10px] leading-none font-extrabold">!</span>
      </span>
      {label}
    </span>
  )
}

/** The fork and knife in a small filled circle, as the calendar draws a cheat day. */
function CheatDaySymbol({ on }: { readonly on: boolean }) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center rounded-full ${on ? 'bg-on-mark text-cheat' : 'bg-cheat text-on-mark'}`}
    >
      <ForkKnifeSymbol className="!h-2.5 !w-2.5" strokeWidth="1.8" />
    </span>
  )
}

/** "Cheat meal", or "Cheat meal: Lunch, Dinner" with the ticked meals in the day's order */
function cheatMealName(cheatMeals: DayFlags['cheatMeals']): string {
  const ticked = MEAL_TYPES.filter(({ type }) => cheatMeals.has(type)).map(({ label }) => label)
  return ticked.length > 0 ? `Cheat meal: ${ticked.join(', ')}` : 'Cheat meal'
}

/**
 * The flags of the open day as a row of toggle chips in the Meals heading row (so Today still fits
 * the screen). The row scrolls sideways when it does not fit.
 */
export function DayFlagChips({ flags, missingLabel, leading }: DayFlagChipsProps) {
  // state, not a ref object: the popover reads the chip while rendering
  const [cheatMealChip, setCheatMealChip] = useState<HTMLButtonElement | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  return (
    <div
      role="group"
      aria-label="Day flags"
      // horizontal scrolling must not switch tabs or swipe back
      data-swipe-lock=""
      // py/-my keep the 44 pt tap area of the chips inside the scroll area without growing the row
      className="no-scrollbar -mx-1 -my-[7px] flex items-center gap-2 overflow-x-auto px-1 py-[7px]"
    >
      {leading}
      {missingLabel && <MissingBadge label={missingLabel} />}
      <FlagChip
        label="Cheat day"
        color="cheat"
        symbol={<CheatDaySymbol on={flags.dayMark === 'cheat'} />}
        on={flags.dayMark === 'cheat'}
        disabled={!flags.dayMarkLoaded}
        onPress={() => flags.toggle('cheatDay')}
      />
      <FlagChip
        label="Alcohol"
        color="alcohol"
        symbol={<WineGlassSymbol />}
        on={flags.dayMark === 'alcohol'}
        disabled={!flags.dayMarkLoaded}
        onPress={() => flags.toggle('alcohol')}
      />
      <FlagChip
        ref={setCheatMealChip}
        label="Cheat meal"
        accessibleName={cheatMealName(flags.cheatMeals)}
        color="cheat"
        symbol={<ForkKnifeSymbol />}
        on={flags.cheatMeals.size > 0}
        disabled={!flags.cheatMealsLoaded}
        hasPopup
        expanded={popoverOpen}
        onPress={() => setPopoverOpen((open) => !open)}
      />
      <FlagChip
        label="Gym"
        color="gym"
        symbol={<DumbbellSymbol />}
        on={flags.gym}
        disabled={!flags.gymLoaded}
        onPress={() => flags.toggle('gym')}
      />
      {flags.sex !== null && (
        <FlagChip
          label="Sex"
          color="heart"
          symbol={<HeartSymbol />}
          on={flags.sex}
          disabled={!flags.sexLoaded}
          onPress={() => flags.toggle('sex')}
        />
      )}
      <CheatMealPopover
        open={popoverOpen}
        anchor={cheatMealChip}
        cheatMeals={flags.cheatMeals}
        onToggle={flags.toggleCheatMeal}
        onClose={() => setPopoverOpen(false)}
      />
    </div>
  )
}
