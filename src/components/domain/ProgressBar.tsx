export interface ProgressBarProps {
  /** 0–1 */
  value: number
  tone?: 'primary' | 'income' | 'expense' | 'warning'
  /** Required — a progressbar has no visible text, so it must be labelled for screen readers. */
  label: string
  className?: string
}

const TONE_VAR: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'var(--color-primary)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  warning: 'var(--color-warning)',
}

export function ProgressBar({ value, tone = 'primary', label, className }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={className}
      style={{
        height: 6,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-surface-2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: TONE_VAR[tone],
          borderRadius: 'var(--radius-pill)',
        }}
      />
    </div>
  )
}
