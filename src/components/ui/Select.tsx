import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  placeholder?: string
}

/** A native <select> styled to match the rest of the kit — keeps the OS picker UX on mobile, which beats any custom dropdown for accessibility and familiarity. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, style, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-[var(--radius-md)] px-3.5 pr-9 text-[15px] outline-none disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1.5px solid var(--color-border)',
          ...style,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ▾
      </span>
    </div>
  )
})
