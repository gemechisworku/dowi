import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './Input'

export interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'value'
> {
  /** Raw string value — kept as a string so "12." and "0" while typing aren't fought by the caller. */
  value: string
  onValueChange: (raw: string) => void
  invalid?: boolean
  /** How many digits after the decimal point are allowed (currency-dependent). Default 2. */
  decimals?: number
}

/**
 * A text input restricted to a non-negative decimal number, used for money
 * amounts. Deliberately `inputMode="decimal"` rather than `type="number"`
 * so Android shows the numeric keypad but we keep full control over
 * formatting and validation (native number inputs mangle trailing zeros
 * and don't reject e/+/- reliably).
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  { value, onValueChange, decimals = 2, ...props },
  ref,
) {
  const pattern = decimals > 0 ? `^\\d*\\.?\\d{0,${decimals}}$` : '^\\d*$'
  const regex = new RegExp(pattern)

  return (
    <Input
      ref={ref}
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const next = e.target.value
        if (next === '' || regex.test(next)) onValueChange(next)
      }}
      {...props}
    />
  )
})
