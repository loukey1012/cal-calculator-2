import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { canLeavePage } from '../../app/leaveGuard'
import { NotePage } from './NotePage'
import { readNoteDraft } from './noteDraft'
import { NOTE_MAX_LENGTH } from './notePages'

const onSave = vi.fn()
const onClose = vi.fn()
const onRetry = vi.fn()
const PATH = '/today/note-2026-10-21-me'

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => sessionStorage.clear())

function renderPage(saved: string | null | undefined, loadFailed = false) {
  const props = (value: typeof saved) => (
    <NotePage
      path={PATH}
      loadFailed={loadFailed}
      onRetry={onRetry}
      subtitle="Wednesday, 21 October · Dinner"
      saved={value}
      onSave={onSave}
      onClose={onClose}
    />
  )
  const view = render(props(saved))
  const unmount = view.unmount
  return {
    follow: (value: typeof saved) => view.rerender(props(value)),
    unmount,
  }
}

const field = () => screen.getByRole('textbox', { name: 'Note' })

describe('NotePage', () => {
  test('shows the title, what it is for, and the saved note with its length', () => {
    renderPage('Pizza with colleagues')

    expect(screen.getByRole('heading', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByText('Wednesday, 21 October · Dinner')).toBeInTheDocument()
    expect(field()).toHaveValue('Pizza with colleagues')
    expect(screen.getByText('21 / 500')).toBeInTheDocument()
  })

  test('opens with the keyboard: the text area has the focus', () => {
    renderPage(null)

    expect(field()).toHaveFocus()
    expect(screen.getByText('0 / 500')).toBeInTheDocument()
  })

  test('Done saves the edited note and goes back', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.type(field(), ' party')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onSave).toHaveBeenCalledWith('Birthday party')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(window.confirm).not.toHaveBeenCalled()
  })

  test('Done without a change only goes back', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('an emptied note is saved as empty, which removes it', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.clear(field())
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onSave).toHaveBeenCalledWith('')
  })

  test('a new note on a day without one is saved', async () => {
    const user = userEvent.setup()
    renderPage(null)

    await user.type(field(), 'Hiking')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onSave).toHaveBeenCalledWith('Hiking')
  })

  test('only spaces around the text are no change', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.type(field(), '   ')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('Cancel without changes goes back without asking', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('Cancel with changes asks; declining keeps the page and the text', async () => {
    const user = userEvent.setup()
    vi.mocked(window.confirm).mockReturnValue(false)
    renderPage('Birthday')

    await user.type(field(), '!')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
    expect(onClose).not.toHaveBeenCalled()
    expect(field()).toHaveValue('Birthday!')
  })

  test('Cancel with changes goes back without saving once discarding is confirmed', async () => {
    const user = userEvent.setup()
    renderPage('Birthday')

    await user.type(field(), '!')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('the back swipe asks the same question when there are changes', async () => {
    const user = userEvent.setup()
    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderPage('Birthday')

    expect(canLeavePage(PATH)).toBe(true)
    await user.type(field(), '!')

    expect(canLeavePage(PATH)).toBe(false)
    expect(canLeavePage(PATH)).toBe(true)
    expect(window.confirm).toHaveBeenCalledTimes(2)
    expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
  })

  test('holds no more than the limit', async () => {
    const user = userEvent.setup()
    renderPage('x'.repeat(NOTE_MAX_LENGTH - 1))

    await user.type(field(), 'ab')

    expect(field()).toHaveAttribute('maxlength', String(NOTE_MAX_LENGTH))
    expect(screen.getByText('500 / 500')).toBeInTheDocument()
  })

  test('while untouched it follows the live data', () => {
    const { follow } = renderPage('Birthday')

    follow('Birthday at Oma’s')

    expect(field()).toHaveValue('Birthday at Oma’s')
  })

  test('once edited it keeps the text, whatever the partner changes', async () => {
    const user = userEvent.setup()
    const { follow } = renderPage('Birthday')

    await user.type(field(), '!')
    follow('Something else')

    expect(field()).toHaveValue('Birthday!')
  })

  test('an edit taken back follows the live data again', async () => {
    const user = userEvent.setup()
    const { follow } = renderPage('Hi')

    await user.type(field(), '!')
    await user.type(field(), '{Backspace}')
    follow('Hello')

    expect(field()).toHaveValue('Hello')
  })

  test('while loading it is read-only and busy, not disabled, and Done waits', () => {
    renderPage(undefined)

    expect(field()).toHaveAttribute('readonly')
    expect(field()).toHaveAttribute('aria-busy', 'true')
    expect(field()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  })

  test('takes the focus once the note arrives', () => {
    const { follow } = renderPage(undefined)
    expect(field()).not.toHaveFocus()

    follow('Birthday')

    expect(field()).toHaveFocus()
    expect(field()).not.toHaveAttribute('readonly')
  })

  test('a note that fails to load says so and can be retried', async () => {
    const user = userEvent.setup()
    renderPage(undefined, true)

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the note.")
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('the text area is described by the subtitle', () => {
    renderPage('x')

    expect(field()).toHaveAccessibleDescription('Wednesday, 21 October · Dinner')
  })

  test('announces the length only when it gets tight', async () => {
    const user = userEvent.setup()
    renderPage('x'.repeat(NOTE_MAX_LENGTH - 52))
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()

    await user.type(field(), 'ab')
    expect(status).toHaveTextContent('50 characters left')
    await user.type(field(), 'x'.repeat(40))
    expect(status).toHaveTextContent('10 characters left')
    await user.type(field(), 'x'.repeat(10))
    expect(status).toHaveTextContent('Limit reached')
  })

  describe('unsaved text', () => {
    test('is kept outside the page and shown again, with Done enabled', async () => {
      const user = userEvent.setup()
      const first = renderPage('Birthday')
      await user.type(field(), ' party')
      first.unmount()

      renderPage('Birthday')

      expect(field()).toHaveValue('Birthday party')
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
    })

    test('is cleared by Done', async () => {
      const user = userEvent.setup()
      renderPage('Birthday')
      await user.type(field(), '!')
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(readNoteDraft(PATH)).toBeNull()
    })

    test('is cleared by a confirmed Cancel, kept by a declined one', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValueOnce(false)
      renderPage('Birthday')
      await user.type(field(), '!')

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(readNoteDraft(PATH)).toEqual({ text: 'Birthday!', base: 'Birthday' })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(readNoteDraft(PATH)).toBeNull()
    })

    test('is cleared by a confirmed back swipe', async () => {
      const user = userEvent.setup()
      renderPage('Birthday')
      await user.type(field(), '!')

      expect(canLeavePage(PATH)).toBe(true)

      expect(readNoteDraft(PATH)).toBeNull()
    })

    test('is dropped once the text is taken back to the saved note', async () => {
      const user = userEvent.setup()
      renderPage('Hi')
      await user.type(field(), '!')
      await user.type(field(), '{Backspace}')

      expect(readNoteDraft(PATH)).toBeNull()
    })
  })

  describe('a note changed meanwhile', () => {
    test('asks before replacing it; declining keeps editing', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(false)
      const { follow } = renderPage('Birthday')
      await user.type(field(), '!')
      follow('Partner wrote this')

      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(window.confirm).toHaveBeenCalledWith(
        'This note was changed meanwhile. Replace it with yours?',
      )
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
      expect(field()).toHaveValue('Birthday!')
    })

    test('saves over it once confirmed', async () => {
      const user = userEvent.setup()
      const { follow } = renderPage('Birthday')
      await user.type(field(), '!')
      follow('Partner wrote this')

      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(onSave).toHaveBeenCalledWith('Birthday!')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    test('does not ask when nothing changed meanwhile', async () => {
      const user = userEvent.setup()
      renderPage('Birthday')
      await user.type(field(), '!')
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(window.confirm).not.toHaveBeenCalled()
    })
  })
})
