import { useId, type InputHTMLAttributes } from 'react'
import { ClearButton } from './ClearButton'
import { useClearable } from './clearable'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string
  readonly error?: string
}

/** A row inside a GroupedSection: the label doubles as placeholder, errors show underneath. */
export function TextField({ label, error, id, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const {
    ref: clearRef,
    clearable: canClear,
    hasValue: hasText,
    onChange: onTextChange,
    clear,
  } = useClearable(rest)

  return (
    <div className="px-4 py-3">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary"
          {...rest}
          ref={clearRef}
          onChange={onTextChange}
        />
        {canClear && hasText && <ClearButton onClick={clear} />}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
