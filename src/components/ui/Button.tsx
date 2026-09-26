import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_STYLE: Record<ButtonVariant, { background: string; color: string; border?: string }> =
  {
    primary: { background: 'var(--color-primary)', color: 'var(--color-primary-fg)' },
    secondary: {
      background: 'var(--color-surface-2)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
    ghost: { background: 'transparent', color: 'var(--color-primary)' },
    danger: { background: 'var(--color-danger-solid)', color: 'var(--color-primary-fg)' },
  }

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-[15px] gap-2',
  lg: 'h-[52px] px-5 text-base gap-2',
}

/**
 * The one button component for the whole app. Every screen uses this
 * instead of a bare <button> so focus, disabled and loading states stay
 * consistent (PRD §6.1).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    style,
    ...props
  },
  ref,
) {
  const variantStyle = VARIANT_STYLE[variant]
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-[12px] font-semibold transition-[opacity,transform,box-shadow] duration-[var(--motion-fast)] active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className,
      )}
      style={{
        background: isDisabled ? 'var(--color-disabled-bg)' : variantStyle.background,
        color: isDisabled ? 'var(--color-disabled-fg)' : variantStyle.color,
        border: variantStyle.border,
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
})
