import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { MealType } from '../meals/dayModel'
import { DayFlagChips } from './DayFlagChips'
import type { DayFlags } from './useDayFlags'

function flagsWith(overrides: Partial<DayFlags> = {}): DayFlags {
  return {
    dayMark: null,
    dayMarkLoaded: true,
    cheatMeals: new Set<MealType>(),
    cheatMealsLoaded: true,
    gym: false,
    gymLoaded: true,
    sex: false,
    sexLoaded: true,
    toggle: vi.fn(),
    toggleCheatMeal: vi.fn(),
    ...overrides,
  }
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')

describe('DayFlagChips', () => {
  test('lists the chips in order inside a labelled group', () => {
    render(<DayFlagChips flags={flagsWith()} missingLabel={null} />)
    const group = screen.getByRole('group', { name: 'Day flags' })
    expect(group).toHaveAttribute('data-swipe-lock')
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cheat day', 'Alcohol', 'Cheat meal', 'Gym', 'Sex'])
  })

  test('aria-pressed follows the flags', () => {
    render(
      <DayFlagChips
        flags={flagsWith({
          dayMark: 'alcohol',
          gym: true,
          cheatMeals: new Set<MealType>(['lunch']),
        })}
        missingLabel={null}
      />,
    )
    expect(pressed('Cheat day')).toBe('false')
    expect(pressed('Alcohol')).toBe('true')
    expect(pressed('Gym')).toBe('true')
    expect(pressed('Sex')).toBe('false')
  })

  test('Cheat meal is a disclosure: its name carries the ticked meals, not aria-pressed', () => {
    const { rerender } = render(<DayFlagChips flags={flagsWith()} missingLabel={null} />)
    const none = screen.getByRole('button', { name: 'Cheat meal' })
    expect(none).not.toHaveAttribute('aria-pressed')
    expect(none).toHaveAttribute('aria-haspopup', 'dialog')
    expect(none).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <DayFlagChips
        flags={flagsWith({ cheatMeals: new Set<MealType>(['dinner', 'lunch']) })}
        missingLabel={null}
      />,
    )
    const some = screen.getByRole('button', { name: 'Cheat meal: Lunch, Dinner' })
    expect(some).not.toHaveAttribute('aria-pressed')
    expect(some).toHaveClass('bg-cheat')
  })

  test('the row has padding that holds the 44 pt tap areas, so nothing is clipped', () => {
    render(<DayFlagChips flags={flagsWith()} missingLabel={null} />)
    const group = screen.getByRole('group', { name: 'Day flags' })
    expect(group).toHaveClass('py-[7px]', '-my-[7px]', 'px-1', '-mx-1')
  })

  test('taps call toggle with the flag', async () => {
    const flags = flagsWith()
    render(<DayFlagChips flags={flags} missingLabel={null} />)
    for (const name of ['Cheat day', 'Alcohol', 'Gym', 'Sex'])
      await userEvent.click(screen.getByRole('button', { name }))
    expect(flags.toggle).toHaveBeenCalledTimes(4)
    expect(vi.mocked(flags.toggle).mock.calls.map(([flag]) => flag)).toEqual([
      'cheatDay',
      'alcohol',
      'gym',
      'sex',
    ])
  })

  test('Cheat meal opens a popover that allows several ticks and stays open', async () => {
    const flags = flagsWith()
    render(<DayFlagChips flags={flags} missingLabel={null} />)
    const chip = screen.getByRole('button', { name: 'Cheat meal' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Cheat meals' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lunch' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dinner' }))
    expect(vi.mocked(flags.toggleCheatMeal).mock.calls.map(([meal]) => meal)).toEqual([
      'lunch',
      'dinner',
    ])
    expect(screen.getByRole('dialog', { name: 'Cheat meals' })).toBeInTheDocument()
    expect(flags.toggle).not.toHaveBeenCalled()
  })

  test('the missing badge comes first and is not a button', () => {
    render(<DayFlagChips flags={flagsWith()} missingLabel="Lunch missing" />)
    const group = screen.getByRole('group', { name: 'Day flags' })
    expect(group.firstElementChild).toHaveTextContent('Lunch missing')
    expect(screen.queryByRole('button', { name: /missing/ })).toBeNull()
    expect(screen.getByTestId('missing-dot')).toBeInTheDocument()
  })

  test('no missing badge without a label', () => {
    render(<DayFlagChips flags={flagsWith()} missingLabel={null} />)
    expect(screen.queryByTestId('missing-dot')).toBeNull()
  })

  test('Sex is absent without a household', () => {
    render(<DayFlagChips flags={flagsWith({ sex: null, sexLoaded: false })} missingLabel={null} />)
    expect(screen.queryByRole('button', { name: 'Sex' })).toBeNull()
  })

  test('each chip is disabled until its own data has loaded', () => {
    render(
      <DayFlagChips
        flags={flagsWith({ dayMarkLoaded: false, gymLoaded: false, sexLoaded: false })}
        missingLabel={null}
      />,
    )
    for (const name of ['Cheat day', 'Alcohol', 'Gym', 'Sex'])
      expect(screen.getByRole('button', { name })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cheat meal' })).toBeEnabled()
  })
})
