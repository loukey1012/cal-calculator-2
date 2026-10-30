import { describe, expect, test } from 'vitest'
import {
  isQuiet,
  parseChangeRow,
  partnerChangeMessage,
  stillChanged,
  type PartnerChange,
} from './partnerChanges'

const TODAY = '2026-10-30' // a Friday
function tell(...args: Parameters<typeof partnerChangeMessage>) {
  const message = partnerChangeMessage(...args)
  if (!message) throw new Error('expected a message')
  return message
}
const meal = (date: string, subject: string): PartnerChange => ({
  date,
  kind: 'meal',
  subject,
  before: null,
})
const flag = (date: string, subject: string, before = 'none'): PartnerChange => ({
  date,
  kind: 'flag',
  subject,
  before,
})
const note = (date: string, subject = 'day'): PartnerChange => ({
  date,
  kind: 'note',
  subject,
  before: null,
})

describe('partnerChangeMessage', () => {
  test('meals on one day', () => {
    expect(tell('baby', [meal(TODAY, 'dinner'), meal(TODAY, 'lunch')], TODAY)).toEqual({
      title: 'baby changed your meals today',
      body: 'Lunch, Dinner',
      url: '/today',
      tag: 'partner',
    })
  })

  test('a flag alone has no body', () => {
    const message = tell('baby', [flag('2026-10-27', 'gym')], TODAY)

    expect(message.title).toBe('baby changed a flag on Tuesday')
    expect(message.body).toBeUndefined()
    expect(message.url).toBe('/history/2026-10-27')
  })

  test('meals and a note on one day', () => {
    const message = tell('baby', [meal('2026-10-27', 'dinner'), note('2026-10-27')], TODAY)

    expect(message.title).toBe('baby changed your meals and a note on Tuesday')
    expect(message.body).toBe('Dinner, a note')
  })

  test('several days: one line per day, newest first', () => {
    const message = tell(
      'baby',
      [flag('2026-10-27', 'gym'), meal(TODAY, 'lunch'), note('2026-10-27', 'lunch')],
      TODAY,
    )

    expect(message).toEqual({
      title: 'baby changed your meals, a flag and a note',
      body: 'Today: Lunch · Tue 27 Oct: a flag, a note',
      url: '/today',
      tag: 'partner',
    })
  })

  test('counts distinct flags and notes, plural wording', () => {
    const message = tell(
      'baby',
      [flag(TODAY, 'gym'), flag(TODAY, 'day_mark'), note(TODAY), note(TODAY, 'lunch')],
      TODAY,
    )

    expect(message.title).toBe('baby changed flags and notes today')
    expect(message.body).toBeUndefined()
  })

  test('day words: yesterday, within six days, older', () => {
    expect(tell('b', [meal('2026-10-29', 'lunch')], TODAY).title).toBe(
      'b changed your meals yesterday',
    )
    expect(tell('b', [meal('2026-10-24', 'lunch')], TODAY).title).toBe(
      'b changed your meals on Saturday',
    )
    expect(tell('b', [meal('2026-10-20', 'lunch')], TODAY).title).toBe(
      'b changed your meals on 20 Oct',
    )
  })

  test('a past-only change opens that day', () => {
    expect(tell('b', [meal('2026-10-18', 'lunch')], TODAY).url).toBe('/history/2026-10-18')
  })

  test('the message never names a flag', () => {
    const subjects = ['day_mark', 'gym', 'cheat_meal:lunch', 'cheat_meal:snack']
    for (const subject of subjects) {
      for (const changes of [
        [flag(TODAY, subject)],
        [flag(TODAY, subject), meal('2026-10-27', 'lunch')],
      ]) {
        const message = tell('baby', changes, TODAY)
        expect(`${message.title} ${message.body ?? ''}`).not.toMatch(/gym|sex|cheat|alcohol/i)
      }
    }
  })
})

describe('tell (limits)', () => {
  test('nothing to tell gives no message', () => {
    expect(partnerChangeMessage('b', [], TODAY)).toBeNull()
  })

  test('at most four day lines, then how many more days', () => {
    const days = [
      '2026-10-29',
      '2026-10-28',
      '2026-10-27',
      '2026-10-26',
      '2026-10-25',
      '2026-10-24',
    ]
    const message = tell(
      'b',
      days.map((day) => meal(day, 'lunch')),
      TODAY,
    )

    expect(message.body?.split(' · ')).toHaveLength(5)
    expect(message.body?.endsWith(' · +2 more days')).toBe(true)
    expect(message.body).toContain('Wed 28 Oct')
    expect(message.body).not.toContain('Sun 25 Oct')
  })

  test('one day over the cap reads "+1 more day"', () => {
    const days = ['2026-10-29', '2026-10-28', '2026-10-27', '2026-10-26', '2026-10-25']
    const message = tell(
      'b',
      days.map((day) => meal(day, 'lunch')),
      TODAY,
    )

    expect(message.body?.endsWith(' · +1 more day')).toBe(true)
  })

  test('exactly four days have no "more" part', () => {
    const days = ['2026-10-29', '2026-10-28', '2026-10-27', '2026-10-26']
    const message = tell(
      'b',
      days.map((day) => meal(day, 'lunch')),
      TODAY,
    )

    expect(message.body).not.toContain('more')
  })
})

describe('stillChanged', () => {
  const current = (date: string, subject: string): string | undefined =>
    ({ [`${TODAY}|gym`]: 'off', [`${TODAY}|day_mark`]: 'alcohol' })[`${date}|${subject}`]

  test('drops flags back at their old value', () => {
    expect(stillChanged([flag(TODAY, 'gym', 'off')], current)).toEqual([])
  })

  test('keeps flags that differ, and meals and notes always', () => {
    const rows = [
      flag(TODAY, 'day_mark', 'none'),
      flag(TODAY, 'gym', 'on'),
      meal(TODAY, 'lunch'),
      note(TODAY),
    ]

    expect(stillChanged(rows, current)).toEqual(rows)
  })

  test('a cheat meal switched on and off again is dropped', () => {
    const now = () => 'off'
    expect(stillChanged([flag(TODAY, 'cheat_meal:lunch', 'off')], now)).toEqual([])
    expect(stillChanged([flag(TODAY, 'cheat_meal:lunch', 'on')], () => 'on')).toEqual([])
  })

  test('a flag whose current value is unknown is kept', () => {
    const rows = [flag(TODAY, 'sex', 'off'), flag(TODAY, 'cheat_meal:lunch', 'off')]

    expect(stillChanged(rows, () => undefined)).toEqual(rows)
  })

  test('a missing or null before never equals a known value', () => {
    const rows = [{ ...flag(TODAY, 'gym'), before: null }]

    expect(stillChanged(rows, () => 'off')).toEqual(rows)
    expect(stillChanged([flag(TODAY, 'gym', 'weird')], () => 'off')).toHaveLength(1)
  })
})

describe('parseChangeRow', () => {
  const good = {
    actor_id: 'a',
    date: TODAY,
    kind: 'flag',
    subject: 'cheat_meal:snack',
    before: 'off',
    changed_at: '2026-10-30T10:00:00Z',
  }

  test('accepts valid rows of every kind', () => {
    expect(parseChangeRow(good)).toEqual(good)
    expect(parseChangeRow({ ...good, kind: 'meal', subject: 'lunch', before: null })).not.toBeNull()
    expect(parseChangeRow({ ...good, kind: 'note', subject: 'day', before: null })).not.toBeNull()
    expect(
      parseChangeRow({ ...good, kind: 'note', subject: 'dinner', before: null }),
    ).not.toBeNull()
    expect(parseChangeRow({ ...good, subject: 'gym' })).not.toBeNull()
    expect(parseChangeRow({ ...good, subject: 'day_mark' })).not.toBeNull()
  })

  test.each([
    ['null', null],
    ['a string', 'x'],
    ['unknown kind', { ...good, kind: 'sex' }],
    ['meal with a bad meal', { ...good, kind: 'meal', subject: 'brunch' }],
    ['meal with day', { ...good, kind: 'meal', subject: 'day' }],
    ['flag with a bad subject', { ...good, subject: 'sex' }],
    ['cheat meal with a bad meal', { ...good, subject: 'cheat_meal:brunch' }],
    ['note with a bad subject', { ...good, kind: 'note', subject: 'gym' }],
    ['before a number', { ...good, before: 3 }],
    ['before missing', { ...good, before: undefined }],
    ['changed_at not a date', { ...good, changed_at: 'soon' }],
    ['actor missing', { ...good, actor_id: undefined }],
    ['date missing', { ...good, date: undefined }],
  ])('drops %s', (_name, raw) => {
    expect(parseChangeRow(raw)).toBeNull()
  })
})

describe('isQuiet', () => {
  const now = new Date('2026-10-20T12:10:00Z')

  test('true once the newest change is 3 minutes old', () => {
    expect(isQuiet(['2026-10-20T12:00:00Z', '2026-10-20T12:07:00Z'], now)).toBe(true)
    expect(isQuiet(['2026-10-20T12:00:00Z', '2026-10-20T12:08:00Z'], now)).toBe(false)
    expect(isQuiet([], now)).toBe(false)
  })

  test('ignores timestamps that do not parse', () => {
    expect(isQuiet(['nonsense', '2026-10-20T12:00:00Z'], now)).toBe(true)
    expect(isQuiet(['nonsense'], now)).toBe(false)
  })
})
