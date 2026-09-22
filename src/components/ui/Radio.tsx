import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = id ?? `${props.name}-${props.value}`
  return (
    <label
      htmlFor={generatedId}
      className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2.5', className)}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={generatedId}
          type="radio"
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-2 border-[var(--color-border-strong)] transition-colors checked:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          {...props}
        />
        {/* Absolutely positioned for the same reason as Checkbox's checkmark — see its comment. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute hidden h-2.5 w-2.5 rounded-full peer-checked:block"
          style={{ background: 'var(--color-primary)' }}
        />
      </span>
      {label && <span className="text-[15px]">{label}</span>}
    </label>
  )
})
