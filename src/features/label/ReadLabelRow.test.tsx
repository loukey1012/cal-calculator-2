import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./recognize', () => ({ recognizeText: vi.fn() }))

import { recognizeText } from './recognize'
import { ReadLabelRow } from './ReadLabelRow'

const PHOTO = new File(['photo'], 'label.jpg', { type: 'image/jpeg' })
const LABEL = 'Energie 1520 kJ / 363 kcal\nFett 9,8 g\nEiweiß 8,4 g'

beforeEach(() => vi.clearAllMocks())

function renderRow() {
  const onRead = vi.fn()
  render(<ReadLabelRow onRead={onRead} />)
  return { onRead, input: screen.getByLabelText('Photo of the nutrition label') }
}

describe('ReadLabelRow', () => {
  test('the photo is read and its values handed over', async () => {
    vi.mocked(recognizeText).mockResolvedValue(LABEL)
    const user = userEvent.setup()
    const { onRead, input } = renderRow()

    await user.upload(input, PHOTO)

    await waitFor(() => expect(onRead).toHaveBeenCalled())
    expect(recognizeText).toHaveBeenCalledWith(PHOTO, expect.any(Function))
    expect(onRead.mock.calls[0]?.[0]).toMatchObject({
      measure: 'g',
      values: { kcal: 363, fat: 9.8, protein: 8.4 },
      found: 3,
    })
  })

  test('says what it is doing while reading', async () => {
    vi.mocked(recognizeText).mockImplementation(async (_photo, onStep) => {
      onStep?.('loading')
      return new Promise(() => {})
    })
    const user = userEvent.setup()
    const { input } = renderRow()

    await user.upload(input, PHOTO)

    expect(await screen.findByRole('status')).toHaveTextContent('Loading text recognition')
    expect(screen.getByRole('button', { name: 'Read nutrition label' })).toBeDisabled()
  })

  test('a photo without a nutrition table, or a failed read, says so', async () => {
    vi.mocked(recognizeText).mockResolvedValueOnce('Zutaten: Mehl, Wasser')
    vi.mocked(recognizeText).mockRejectedValueOnce(new Error('out of memory'))
    const user = userEvent.setup()
    const { onRead, input } = renderRow()

    await user.upload(input, PHOTO)
    expect(await screen.findByRole('alert')).toHaveTextContent('No nutrition table found')
    await user.upload(input, PHOTO)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t read'))

    expect(onRead).not.toHaveBeenCalled()
  })
})
