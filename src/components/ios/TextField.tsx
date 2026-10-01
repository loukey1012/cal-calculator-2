import { useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string
  readonly error?: string
}

/** A row inside a GroupedSection: the label doubles as placeholder, errors show underneath. */
export function TextField({ label, error, id, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="px-4 py-3">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        placeholder={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full bg-transparent text-[17px] text-label outline-none placeholder:text-label-secondary"
        {...rest}
      />
      {error && (
        <p id={errorId} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
