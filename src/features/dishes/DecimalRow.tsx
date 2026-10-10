import { useState } from 'react'
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
}: DecimalRowProps) {
  const [text, setText] = useState(initialText ?? (value === null ? '' : String(value)))
  return (
    <InputRow
      label={label}
      accessibleLabel={accessibleLabel}
      suffix={suffix}
      inputMode="decimal"
      placeholder="0"
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onTextChange?.(event.target.value)
        onChange(parse(event.target.value))
      }}
    />
  )
}
