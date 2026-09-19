import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './Input'

export type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * A native <input type="date"> styled to match the kit. Android/Chrome's
 * built-in date picker is faster and more familiar than any custom widget
 * we could build, and it comes with locale formatting for free.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(props, ref) {
    return <Input ref={ref} type="date" {...props} />
  },
)
