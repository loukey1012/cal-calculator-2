import { useId, useState, type ReactNode } from 'react'
import { InputRow } from '../../components/ios/FormRows'
import { parseDecimal } from '../../lib/numbers'

type DecimalRowProps = {
  readonly label: string
  readonly accessibleLabel?: string
  readonly suffix?: string
  readonly value: number | null
  /** null while the field is empty or not a number */
  readonly onChange: (value: number | null) => void
  /** the text shown at first, when it isn't just the value (e.g. "1/3") */
  readonly initialText?: string
  /** turns the typed text into a number; decimals by default */
  readonly parse?: (text: string) => number | null
  /** the text as typed, e.g. to add to it */
  readonly onTextChange?: (text: string) => void
  /** a line under the row, read with the field (e.g. what the amount comes to) */
  readonly hint?: ReactNode
}

/** A number row that keeps what is typed (e.g. "1," on the way to "1,5"). */
export function DecimalRow({
  label,
  accessibleLabel,
  suffix,
  value,
  onChange,
  initialText,
  parse = parseDecimal,
  onTextChange,
  hint,
}: DecimalRowProps) {
  const hintId = useId()
  const [text, setText] = useState(initialText ?? (value === null ? '' : String(value)))
  const row = (
    <InputRow
      label={label}
      accessibleLabel={accessibleLabel}
      suffix={suffix}
      inputMode="decimal"
      placeholder="0"
      aria-describedby={hint === undefined ? undefined : hintId}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onTextChange?.(event.target.value)
        onChange(parse(event.target.value))
      }}
    />
  )
  if (hint === undefined) return row
  return (
    <div>
      {row}
      <p id={hintId} className="px-4 pb-2 text-[13px] text-label-secondary">
        {hint}
      </p>
    </div>
  )
}
