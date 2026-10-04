import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

function FieldError({ id, error }: { readonly id: string; readonly error?: string }) {
  if (!error) return null
  return (
    <p id={id} className="mt-1 text-[13px] text-destructive">
      {error}
    </p>
  )
}

type InputRowProps = InputHTMLAttributes<HTMLInputElement> & {
  /** visible label on the left */
  readonly label: string
  /** accessible name when the visible label alone is ambiguous, e.g. "Calories per 100 g" */
  readonly accessibleLabel?: string
  readonly suffix?: string
  readonly error?: string
  readonly indent?: boolean
}

/** iOS settings-style row: label left, right-aligned input, optional unit suffix. */
export function InputRow({
  label,
  accessibleLabel,
  suffix,
  error,
  indent = false,
  ...inputProps
}: InputRowProps) {
  const id = useId()
  return (
    <div className={`py-2.5 pr-4 ${indent ? 'pl-8' : 'pl-4'}`}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="flex-1 text-[17px]">
          {label}
        </label>
        <input
          id={id}
          aria-label={accessibleLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-28 bg-transparent text-right text-[17px] text-label outline-none placeholder:text-label-secondary/60"
          {...inputProps}
        />
        {suffix && <span className="w-8 text-[15px] text-label-secondary">{suffix}</span>}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  )
}

type ToggleRowProps = {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly error?: string
}

/** Row with an iOS switch. */
export function ToggleRow({ label, checked, onChange, error }: ToggleRowProps) {
  const id = useId()
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between">
        <span id={`${id}-label`} className="text-[17px]">
          {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onClick={() => onChange(!checked)}
          className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
            checked ? 'bg-success' : 'bg-track'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  )
}

type SelectRowProps = SelectHTMLAttributes<HTMLSelectElement> & {
  readonly label: string
  readonly children: ReactNode
}

/** Row with a native select, which iOS shows as its wheel picker. */
export function SelectRow({ label, children, ...selectProps }: SelectRowProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <label htmlFor={id} className="flex-1 text-[17px]">
        {label}
      </label>
      <select
        id={id}
        className="max-w-[60%] bg-transparent text-right text-[17px] text-label-secondary outline-none"
        {...selectProps}
      >
        {children}
      </select>
    </div>
  )
}
