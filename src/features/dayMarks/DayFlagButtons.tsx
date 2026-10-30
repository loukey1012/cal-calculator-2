import { useState } from 'react'
import {
  DumbbellSymbol,
  ForkKnifeSymbol,
  HeartSymbol,
  WineGlassSymbol,
} from '../history/calendarSymbols'
import { MEAL_TYPES } from '../meals/dayModel'
import { CheatPopover } from './CheatPopover'
import { FlagButton } from './FlagButton'
import type { DayFlags } from './useDayFlags'

type DayFlagButtonsProps = {
  readonly flags: DayFlags
  /** whose day it is, when it's the partner's: icon-only buttons don't say so otherwise */
  readonly partnerName?: string | null
}

/** The fork and knife in a small filled dot, as the calendar draws a cheat day. */
function CheatDaySymbol({ on }: { readonly on: boolean }) {
  return (
    <span
      data-testid="cheat-day-dot"
      className={`flex h-full w-full items-center justify-center rounded-full ${on ? 'bg-on-mark text-cheat' : 'bg-cheat text-on-mark'}`}
    >
      <ForkKnifeSymbol className="!h-2.5 !w-2.5" strokeWidth="1.8" />
    </span>
  )
}

/** "Cheat", "Cheat: whole day", "Cheat: Lunch, Dinner", "Cheat: whole day, Lunch" */
function cheatName(wholeDay: boolean, cheatMeals: DayFlags['cheatMeals']): string {
  const ticked = [
    ...(wholeDay ? ['whole day'] : []),
    ...MEAL_TYPES.filter(({ type }) => cheatMeals.has(type)).map(({ label }) => label),
  ]
  return ticked.length > 0 ? `Cheat: ${ticked.join(', ')}` : 'Cheat'
}

/**
 * The flags of the open day as a row of round icon buttons for the top right corner of the goal
 * card: Cheat (day and meals in one list), Alcohol, Gym and, with a household, Sex.
 */
export function DayFlagButtons({ flags, partnerName = null }: DayFlagButtonsProps) {
  // state, not a ref object: the popover reads the button while rendering
  const [cheatButton, setCheatButton] = useState<HTMLButtonElement | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const wholeDay = flags.dayMark === 'cheat'
  const cheatDisabled = !flags.dayMarkLoaded || !flags.cheatMealsLoaded
  return (
    <div
      role="group"
      aria-label={partnerName ? `Day flags for ${partnerName}` : 'Day flags'}
      className="flex items-center gap-2"
    >
      <FlagButton
        ref={setCheatButton}
        label={cheatName(wholeDay, flags.cheatMeals)}
        color="cheat"
        symbol={wholeDay ? <CheatDaySymbol on /> : <ForkKnifeSymbol />}
        on={wholeDay || flags.cheatMeals.size > 0}
        disabled={cheatDisabled}
        hasPopup
        expanded={popoverOpen}
        onPress={() => setPopoverOpen((open) => !open)}
      />
      <FlagButton
        label="Alcohol"
        color="alcohol"
        symbol={<WineGlassSymbol />}
        on={flags.dayMark === 'alcohol'}
        disabled={!flags.dayMarkLoaded}
        onPress={() => flags.toggle('alcohol')}
      />
      <FlagButton
        label="Gym"
        color="gym"
        symbol={<DumbbellSymbol />}
        on={flags.gym}
        disabled={!flags.gymLoaded}
        onPress={() => flags.toggle('gym')}
      />
      {flags.sex !== null && (
        <FlagButton
          label="Sex"
          color="heart"
          symbol={<HeartSymbol />}
          on={flags.sex}
          disabled={!flags.sexLoaded}
          onPress={() => flags.toggle('sex')}
        />
      )}
      <CheatPopover
        // a list whose data went away (e.g. while refetching) must not stay open
        open={popoverOpen && !cheatDisabled}
        anchor={cheatButton}
        wholeDay={wholeDay}
        cheatMeals={flags.cheatMeals}
        onToggleWholeDay={() => flags.toggle('cheatDay')}
        onToggleMeal={flags.toggleCheatMeal}
        onClose={() => setPopoverOpen(false)}
      />
    </div>
  )
}
