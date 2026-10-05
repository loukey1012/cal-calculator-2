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
}

/** A number row that keeps what is typed (e.g. "1," on the way to "1,5"). */
export function DecimalRow({ label, accessibleLabel, suffix, value, onChange }: DecimalRowProps) {
  const [text, setText] = useState(value === null ? '' : String(value))
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
        onChange(parseDecimal(event.target.value))
      }}
    />
  )
}
