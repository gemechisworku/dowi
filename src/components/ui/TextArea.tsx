import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, style, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-none rounded-[var(--radius-md)] px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
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
