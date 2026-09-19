import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

const baseClass =
  'h-11 w-full rounded-[var(--radius-md)] px-3.5 text-[15px] outline-none transition-colors placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, style, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(baseClass, className)}
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        border: `1.5px solid ${invalid ? 'var(--color-expense)' : 'var(--color-border)'}`,
        ...style,
      }}
      {...props}
    />
  )
})
