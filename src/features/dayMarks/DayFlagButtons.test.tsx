import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { MealType } from '../meals/dayModel'
import { DayFlagButtons } from './DayFlagButtons'
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

describe('DayFlagButtons', () => {
  test('lists Cheat, Alcohol, Gym, Sex in a labelled group, icon only, without a sideways scroller', () => {
    render(<DayFlagButtons flags={flagsWith()} />)
    const group = screen.getByRole('group', { name: 'Day flags' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Cheat',
      'Alcohol',
      'Gym',
      'Sex',
    ])
    expect(buttons.every((b) => b.textContent === '')).toBe(true)
    expect(group).toHaveClass('gap-2')
    expect(group).not.toHaveAttribute('data-swipe-lock')
    expect(group.className).not.toContain('overflow')
  })

  test('aria-pressed follows Alcohol, Gym and Sex', () => {
    render(<DayFlagButtons flags={flagsWith({ dayMark: 'alcohol', gym: true })} />)
    expect(pressed('Alcohol')).toBe('true')
    expect(pressed('Gym')).toBe('true')
    expect(pressed('Sex')).toBe('false')
  })

  test('Cheat is a disclosure with no aria-pressed', () => {
    render(<DayFlagButtons flags={flagsWith()} />)
    const cheat = screen.getByRole('button', { name: 'Cheat' })
    expect(cheat).not.toHaveAttribute('aria-pressed')
    expect(cheat).toHaveAttribute('aria-haspopup', 'dialog')
    expect(cheat).toHaveAttribute('aria-expanded', 'false')
    expect(cheat).not.toHaveClass('bg-cheat')
  })

  test.each([
    ['cheat day', { dayMark: 'cheat' as const }, 'Cheat: whole day'],
    [
      'meals in the day’s order',
      { cheatMeals: new Set<MealType>(['dinner', 'lunch']) },
      'Cheat: Lunch, Dinner',
    ],
    [
      'whole day and a meal',
      { dayMark: 'cheat' as const, cheatMeals: new Set<MealType>(['lunch']) },
      'Cheat: whole day, Lunch',
    ],
  ])('the Cheat name carries the state (%s)', (_label, overrides, name) => {
    render(<DayFlagButtons flags={flagsWith(overrides)} />)
    expect(screen.getByRole('button', { name })).toHaveClass('bg-cheat')
  })

  test('an alcohol day alone does not fill Cheat', () => {
    render(<DayFlagButtons flags={flagsWith({ dayMark: 'alcohol' })} />)
    expect(screen.getByRole('button', { name: 'Cheat' })).not.toHaveClass('bg-cheat')
  })

  test('the symbol is the plain fork and knife, or the dotted one for the whole day', () => {
    const { rerender } = render(
      <DayFlagButtons flags={flagsWith({ cheatMeals: new Set<MealType>(['lunch']) })} />,
    )
    expect(screen.queryByTestId('cheat-day-dot')).toBeNull()
    rerender(<DayFlagButtons flags={flagsWith({ dayMark: 'cheat' })} />)
    expect(screen.getByTestId('cheat-day-dot')).toBeInTheDocument()
  })

  test('taps on Alcohol, Gym and Sex call toggle with the flag', async () => {
    const flags = flagsWith()
    render(<DayFlagButtons flags={flags} />)
    for (const name of ['Alcohol', 'Gym', 'Sex'])
      await userEvent.click(screen.getByRole('button', { name }))
    expect(vi.mocked(flags.toggle).mock.calls.map(([flag]) => flag)).toEqual([
      'alcohol',
      'gym',
      'sex',
    ])
  })

  test('Cheat opens the list; Whole day toggles the day mark, meals toggle meals, it stays open', async () => {
    const flags = flagsWith()
    render(<DayFlagButtons flags={flags} />)
    const cheat = screen.getByRole('button', { name: 'Cheat' })
    await userEvent.click(cheat)
    expect(cheat).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Cheat' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Whole day' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lunch' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dinner' }))
    expect(flags.toggle).toHaveBeenCalledExactlyOnceWith('cheatDay')
    expect(vi.mocked(flags.toggleCheatMeal).mock.calls.map(([meal]) => meal)).toEqual([
      'lunch',
      'dinner',
    ])
    expect(screen.getByRole('dialog', { name: 'Cheat' })).toBeInTheDocument()
  })

  test('on the partner’s day the group says whose flags they are', () => {
    render(<DayFlagButtons flags={flagsWith()} partnerName="baby" />)
    expect(screen.getByRole('group', { name: 'Day flags for baby' })).toBeInTheDocument()
  })

  test('the Cheat list closes when its data goes away', async () => {
    const { rerender } = render(<DayFlagButtons flags={flagsWith()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cheat' }))
    expect(screen.getByRole('dialog', { name: 'Cheat' })).toBeInTheDocument()

    rerender(<DayFlagButtons flags={flagsWith({ cheatMealsLoaded: false })} />)

    expect(screen.queryByRole('dialog', { name: 'Cheat' })).not.toBeInTheDocument()
  })

  test('Sex is absent without a household', () => {
    render(<DayFlagButtons flags={flagsWith({ sex: null, sexLoaded: false })} />)
    expect(screen.queryByRole('button', { name: 'Sex' })).toBeNull()
  })

  test('each button is disabled until its own data has loaded', () => {
    render(
      <DayFlagButtons
        flags={flagsWith({ dayMarkLoaded: false, gymLoaded: false, sexLoaded: false })}
      />,
    )
    for (const name of ['Cheat', 'Alcohol', 'Gym', 'Sex'])
      expect(screen.getByRole('button', { name })).toBeDisabled()
  })

  test('Cheat waits for the day’s meals too', () => {
    render(<DayFlagButtons flags={flagsWith({ cheatMealsLoaded: false })} />)
    expect(screen.getByRole('button', { name: 'Cheat' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Alcohol' })).toBeEnabled()
  })
})
