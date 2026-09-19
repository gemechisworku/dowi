import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
}

/** An on/off toggle, e.g. Settings → enable a reminder. Visually hides the native checkbox but keeps it in the DOM for correct semantics/keyboard support. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = id ?? props.name
  return (
    <label
      htmlFor={generatedId}
      className={cn('inline-flex min-h-11 cursor-pointer items-center gap-3', className)}
    >
      {label && <span className="text-[15px]">{label}</span>}
      <span className="relative inline-block h-7 w-12 shrink-0">
        <input
          ref={ref}
          id={generatedId}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full transition-colors peer-checked:[background:var(--color-primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
          style={{ background: 'var(--color-border-strong)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  )
})
