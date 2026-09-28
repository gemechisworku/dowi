import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
  /**
   * "inverse" is a translucent-white-on-colour styling for use on a tinted/dark
   * background (e.g. Home's gradient hero, Option A) where the default
   * surface-coloured track would have no contrast against it.
   */
  variant?: 'default' | 'inverse'
}

/*
 * "inverse" is transparent, not a translucent white wash: any white tint at
 * all here lightens the effective background the unselected label's own
 * (already-translucent) --color-on-brand-muted text sits on, and that pair
 * can't clear 4.5:1 together — verified even a 0.03 alpha wash drops it
 * below the minimum, so the selected pill's own opaque
 * --color-on-brand-surface-strong is what carries the visual structure.
 */
const TRACK_BACKGROUND: Record<'default' | 'inverse', string> = {
  default: 'var(--color-surface-2)',
  inverse: 'transparent',
}

/** The Day/Week/Month/FY (and similar) period switch. A single visible control acting as a radiogroup. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  variant = 'default',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-[12px] p-1', className)}
      style={{ background: TRACK_BACKGROUND[variant] }}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className="rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            style={
              variant === 'inverse'
                ? {
                    background: selected ? 'var(--color-on-brand-surface-strong)' : 'transparent',
                    color: selected ? 'var(--blue-700)' : 'var(--color-on-brand-muted)',
                  }
                : {
                    background: selected ? 'var(--color-primary)' : 'transparent',
                    color: selected ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
                  }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
