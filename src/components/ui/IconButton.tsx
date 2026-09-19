import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — IconButton has no visible text, so it must be labelled. */
  'aria-label': string
  icon: ReactNode
  variant?: 'surface' | 'ghost'
  badge?: boolean
}

/** A circular 44×44 tap target for a single icon action (bell, back, close, ...). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'surface', badge = false, className, style, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      className={cn(
        'relative flex h-11 w-11 items-center justify-center rounded-full text-lg transition-transform active:scale-95',
        className,
      )}
      style={{
        background: variant === 'surface' ? 'var(--color-surface)' : 'transparent',
        boxShadow: variant === 'surface' ? 'var(--shadow-card)' : undefined,
        ...style,
      }}
      {...props}
    >
      {icon}
      {badge && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 h-2 w-2 rounded-full"
          style={{ background: 'var(--color-expense)', border: '2px solid var(--color-surface)' }}
        />
      )}
    </button>
  )
})
