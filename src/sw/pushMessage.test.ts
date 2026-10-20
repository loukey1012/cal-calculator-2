import { describe, expect, test } from 'vitest'
import { FALLBACK_MESSAGE, readPushText } from './pushMessage'

describe('readPushText', () => {
  test('reads title, body, the page to open and the tag', () => {
    const text = JSON.stringify({
      title: 'Lunch',
      body: 'Nothing logged yet',
      url: '/today',
      tag: 'reminder:lunch',
    })

    expect(readPushText(text)).toEqual({
      title: 'Lunch',
      body: 'Nothing logged yet',
      url: '/today',
      tag: 'reminder:lunch',
    })
  })

  test('without a page it opens the app', () => {
    expect(readPushText(JSON.stringify({ title: 'Hi' }))).toEqual({
      ...FALLBACK_MESSAGE,
      title: 'Hi',
    })
  })

  test.each(['https://evil.example/', '//evil.example/x', 'javascript:alert(1)'])(
    'never opens another site (%s)',
    (url) => {
      expect(readPushText(JSON.stringify({ title: 'Hi', url }))).toEqual({
        ...FALLBACK_MESSAGE,
        title: 'Hi',
      })
    },
  )

  test('plain text still shows, as the body', () => {
    expect(readPushText('Hello')).toEqual({ ...FALLBACK_MESSAGE, body: 'Hello' })
  })

  test('an empty push shows the app name', () => {
    expect(readPushText(null)).toEqual(FALLBACK_MESSAGE)
    expect(readPushText('')).toEqual(FALLBACK_MESSAGE)
  })
})
