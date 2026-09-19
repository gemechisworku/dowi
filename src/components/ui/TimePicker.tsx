import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './Input'

export type TimePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** A native <input type="time">, styled to match — see DatePicker for rationale. */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  function TimePicker(props, ref) {
    return <Input ref={ref} type="time" {...props} />
  },
)
