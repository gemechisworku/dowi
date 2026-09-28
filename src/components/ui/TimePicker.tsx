import { forwardRef, useMemo, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { Input } from './Input'
import { SegmentedControl } from './SegmentedControl'

export type TimePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

type Period = 'AM' | 'PM'
const PERIOD_OPTIONS = [
  { value: 'AM' as const, label: 'AM' },
  { value: 'PM' as const, label: 'PM' },
]

function periodOf(value: string | undefined): Period {
  const hour = Number(value?.slice(0, 2))
  return Number.isFinite(hour) && hour >= 12 ? 'PM' : 'AM'
}

/** Same hour-of-12 and minute, switched to the given period. Defaults to 09:00 if `value` isn't a parseable "HH:MM" yet. */
function withPeriod(value: string | undefined, period: Period): string {
  const [hStr, mStr = '00'] = (value ?? '09:00').split(':')
  let hour = Number(hStr)
  if (!Number.isFinite(hour)) hour = 9
  hour = hour % 12
  if (period === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${mStr}`
}

/**
 * A native <input type="time"> — unchanged in value format/behaviour, so
 * every existing consumer and e2e test keeps working exactly as before —
 * plus an explicit, always-visible AM/PM toggle beside it. The native
 * widget's own AM/PM control is a real, confirmed usability problem: it's a
 * small tap/swipe target whose exact gesture varies by OS and browser, easy
 * to miss entirely. A real user set a reminder intending PM, the native
 * picker silently kept AM, and the reminder fired hours earlier than
 * intended with nothing in the UI making that failure visible or
 * recoverable. This toggle can't be missed the same way — it always shows,
 * in words, which one is actually selected.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { value, onChange, disabled, className, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const period = useMemo(() => periodOf(value as string | undefined), [value])

  function handlePeriodChange(next: Period) {
    if (!onChange) return
    const nextValue = withPeriod(value as string | undefined, next)
    // TimePickerProps' onChange type comes straight from <input>, but every
    // real consumer only ever reads `e.target.value` — this synthesises
    // just enough of a ChangeEvent to satisfy that, without needing a real
    // DOM event from the toggle (which isn't an <input> itself).
    onChange({ target: { value: nextValue } } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        ref={ref}
        type="time"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        {...props}
      />
      <div style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
        <SegmentedControl
          label="AM or PM"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={handlePeriodChange}
        />
      </div>
    </div>
  )
})
