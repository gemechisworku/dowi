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
}

/** The Day/Week/Month/FY (and similar) period switch. A single visible control acting as a radiogroup. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-full p-1', className)}
      style={{ background: 'var(--color-surface-2)' }}
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
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            style={{
              background: selected ? 'var(--color-primary)' : 'transparent',
              color: selected ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
