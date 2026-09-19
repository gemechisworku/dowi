import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = id ?? props.name
  return (
    <label
      htmlFor={generatedId}
      className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2.5', className)}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={generatedId}
          type="checkbox"
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[6px] border-2 transition-colors checked:[background:var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--color-border-strong)' }}
          {...props}
        />
        {/*
          Absolutely positioned so it paints above the (also absolutely
          positioned) input — a positioned element always paints above a
          non-positioned sibling regardless of DOM order, so without this
          the checkmark would be hidden behind the input's own background.
        */}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute hidden h-3 w-3 text-white peer-checked:block"
        >
          <path
            d="M3 8.5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label && <span className="text-[15px]">{label}</span>}
    </label>
  )
})
