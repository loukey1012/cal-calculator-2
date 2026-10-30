import type { DayMark } from '../meals/mealsApi'

export type DayFlag = 'cheatDay' | 'alcohol' | 'gym' | 'sex'

const MARK_OF_FLAG = { cheatDay: 'cheat', alcohol: 'alcohol' } as const

/** The day's mark after a tap: the active one turns off, the other one replaces it. */
export function nextDayMark(current: DayMark, tapped: 'cheatDay' | 'alcohol'): DayMark {
  const tappedMark = MARK_OF_FLAG[tapped]
  return current === tappedMark ? null : tappedMark
}
