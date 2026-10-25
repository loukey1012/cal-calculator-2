import { useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'

// fields iOS gives its own picker (or that hold no text): no clear button
const NOT_CLEARABLE = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'range', 'file'])

/** Empties an input the way typing would, so its onChange follows (controlled or not); keeps focus. */
function clearInput(input: HTMLInputElement | null): void {
  if (!input) return
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.focus()
}

type ClearableProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'type' | 'readOnly' | 'disabled' | 'onChange'
>

/** Whether a field gets a clear button, and whether it has something to clear right now. */
export function useClearable(props: ClearableProps) {
  const ref = useRef<HTMLInputElement>(null)
  // an uncontrolled field's text, followed as it is typed
  const [typed, setTyped] = useState(String(props.defaultValue ?? ''))
  const text = props.value === undefined ? typed : String(props.value)
  return {
    ref,
    clearable: !NOT_CLEARABLE.has(props.type ?? 'text') && !props.readOnly && !props.disabled,
    hasValue: text.trim() !== '',
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setTyped(event.target.value)
      props.onChange?.(event)
    },
    clear: () => clearInput(ref.current),
  }
}
